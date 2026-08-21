// The reconciliation core. Pure, dependency-free, and reads nothing but
// public chain state through the injected `reader`. It never moves funds,
// never alters policy, and never participates in authorization — nothing
// here can weaken Warrant's security even if it is completely wrong, at
// worst it produces a misleading *report*, never a bad state transition.
//
// What this proves and what it doesn't, stated once, here, rather than
// scattered as comments: it establishes whether a specific Warrant-
// authorized transfer was ever followed by a native 0G settlement event
// for the same (Safe, provider) pair, and if so, what the TEE signer and
// settled amount were. It says nothing about whether the underlying
// compute was correct, whether the right model ran, or whether the agent's
// request matched its stated intent. Those claims are out of scope by
// design — see docs/threat-model.md.

const { TOPICS, SELECTORS } = require('./constants')
const { strip0x, wordToAddress, decodeSettleFeesWithTEECalldata } = require('./abiCodec')
const { findAndDecode, findAllAndDecode, decodeTEESettlementResult, decodeProviderTEESignerAcknowledged } = require('./events')

const STATUS = {
  AUTHORIZED_ONLY: 'AUTHORIZED_ONLY',
  AUTHORIZED_AND_SETTLED: 'AUTHORIZED_AND_SETTLED',
  AUTHORIZED_SETTLEMENT_UNCORRELATED: 'AUTHORIZED_SETTLEMENT_UNCORRELATED',
}

function padAddressTopic(address) {
  return '0x' + strip0x(address).toLowerCase().padStart(64, '0')
}

function emptyReport(base) {
  return {
    warrantId: base.warrantId,
    transferTxHash: base.transferTxHash,
    provider: base.provider,
    authorizedAmount: base.authorizedAmount,
    settlementTxHash: null,
    teeSignerAddress: null,
    settledAmount: null,
    status: STATUS.AUTHORIZED_ONLY,
    warnings: [],
  }
}

/**
 * Reads the TEE signer address a provider had acknowledged as of `atBlock`,
 * from the real ProviderTEESignerAcknowledged event history — never
 * guessed, never read from a struct whose exact layout wasn't confirmed.
 * Returns null (not a guess) if no acknowledgment is found before atBlock.
 */
async function getTeeSignerAtBlock(reader, inferenceServingAddress, provider, atBlockHex) {
  const logs = await reader.getLogs({
    address: inferenceServingAddress,
    topics: [TOPICS.PROVIDER_TEE_SIGNER_ACKNOWLEDGED, padAddressTopic(provider)],
    fromBlock: '0x0',
    toBlock: atBlockHex,
  })
  const decoded = logs.map((log) => decodeProviderTEESignerAcknowledged(log))
  const acknowledgedInOrder = decoded.filter((d) => d.acknowledged)
  if (acknowledgedInOrder.length === 0) return null
  return acknowledgedInOrder[acknowledgedInOrder.length - 1].teeSignerAddress
}

/**
 * Given the tx hash of a settleFeesWithTEE call, decodes its calldata and
 * returns the settlement item that positionally corresponds to a specific
 * TEESettlementResult log within that same transaction's receipt.
 *
 * The correlation rule — that TEESettlementResult events are emitted in
 * the same order as the input TEESettlementData[] array — is an assumption
 * about 0G's implementation, not a directly observed fact: no real
 * multi-item settlement transaction has been captured to confirm it (see
 * docs/m4-reconciliation.md, "Open ambiguity"). It is the standard
 * Solidity pattern for a function returning one status per input item, and
 * is treated as reliable, but it is explicitly named here rather than
 * silently baked in.
 */
async function correlateCalldataItem(reader, settlementTxHash, targetLogIndexHex) {
  const [tx, receipt] = await Promise.all([
    reader.getTransactionByHash(settlementTxHash),
    reader.getTransactionReceipt(settlementTxHash),
  ])
  if (!tx || !receipt) return { item: null, reason: 'settlement transaction or receipt not found' }

  let decodedCalldata
  try {
    decodedCalldata = decodeSettleFeesWithTEECalldata(tx.input)
  } catch (e) {
    return { item: null, reason: `failed to decode settlement calldata: ${e.message}` }
  }
  if (decodedCalldata.selector.toLowerCase() !== SELECTORS.SETTLE_FEES_WITH_TEE.toLowerCase()) {
    return { item: null, reason: 'transaction is not a settleFeesWithTEE call' }
  }

  const allResultLogsInTx = receipt.logs
    .filter((l) => l.topics && l.topics[0] && l.topics[0].toLowerCase() === TOPICS.TEE_SETTLEMENT_RESULT.toLowerCase())
    .sort((a, b) => Number(a.logIndex) - Number(b.logIndex))

  const position = allResultLogsInTx.findIndex((l) => l.logIndex === targetLogIndexHex)
  if (position === -1) return { item: null, reason: 'target log not found among this transaction\'s settlement results' }
  if (position >= decodedCalldata.settlements.length) {
    return { item: null, reason: 'settlement result position exceeds decoded calldata array length' }
  }
  return { item: decodedCalldata.settlements[position], reason: null }
}

/**
 * Reconciles a single Warrant-authorized transfer against native 0G
 * settlement events.
 *
 * @param {object} reader - a chain reader (see chainReader.js for the real
 *   implementation; tests inject a fixture-backed one instead)
 * @param {object} params
 * @param {string} params.transferTxHash - the tx that called
 *   WarrantModule.executeTransfer and succeeded
 * @param {string} params.moduleAddress - the WarrantModule that should have
 *   emitted TransferExecuted in that transaction
 * @param {string} params.inferenceServingAddress - the 0G InferenceServing
 *   contract to search for settlement events on
 * @param {string} [params.searchToBlock] - upper bound for the settlement
 *   search, defaults to 'latest'
 * @returns {Promise<object>} the reconciliation report
 */
async function reconcile(reader, params) {
  const { transferTxHash, moduleAddress, inferenceServingAddress, searchToBlock } = params

  const receipt = await reader.getTransactionReceipt(transferTxHash)
  if (!receipt) {
    throw new Error(`transferTxHash not found on chain: ${transferTxHash}`)
  }
  if (receipt.status !== '0x1') {
    throw new Error(`transferTxHash did not succeed (status ${receipt.status}), nothing to reconcile: ${transferTxHash}`)
  }

  const moduleLogs = receipt.logs.filter((l) => l.address && l.address.toLowerCase() === moduleAddress.toLowerCase())
  const transferEvent = findAndDecode(moduleLogs, TOPICS.TRANSFER_EXECUTED)
  if (!transferEvent) {
    throw new Error(
      `no TransferExecuted event from module ${moduleAddress} found in tx ${transferTxHash} — ` +
        'this does not look like a Warrant-authorized transfer'
    )
  }
  const { warrantId, provider, amount: authorizedAmount } = transferEvent.decoded

  const safeWord = await reader.call({ to: moduleAddress, data: SELECTORS.SAFE_GETTER })
  const safe = wordToAddress(strip0x(safeWord))

  const base = { warrantId, transferTxHash, provider, authorizedAmount }

  const settlementLogs = await reader.getLogs({
    address: inferenceServingAddress,
    topics: [TOPICS.TEE_SETTLEMENT_RESULT, padAddressTopic(safe)],
    fromBlock: receipt.blockNumber,
    toBlock: searchToBlock,
  })

  if (settlementLogs.length === 0) {
    return emptyReport(base)
  }

  const uncorrelated = []
  for (const log of settlementLogs) {
    const eventDecoded = decodeTEESettlementResult(log)
    const { item, reason } = await correlateCalldataItem(reader, log.transactionHash, log.logIndex)

    if (!item) {
      uncorrelated.push({ settlementTxHash: log.transactionHash, reason })
      continue
    }
    if (item.user.toLowerCase() !== safe.toLowerCase() || item.provider.toLowerCase() !== provider.toLowerCase()) {
      // A real settlement, for this user, but positionally correlated to a
      // different provider (or, defensively, a different user) than ours.
      // Not our settlement — keep looking, don't force a match.
      uncorrelated.push({
        settlementTxHash: log.transactionHash,
        reason: `calldata item at this position is for (${item.user}, ${item.provider}), not our (${safe}, ${provider})`,
      })
      continue
    }

    const settledAmount = item.totalFee - eventDecoded.unsettledAmount
    const teeSignerAddress = await getTeeSignerAtBlock(reader, inferenceServingAddress, provider, log.blockNumber)
    const warnings = []
    if (teeSignerAddress === null) {
      warnings.push('no ProviderTEESignerAcknowledged event found for this provider before the settlement block')
    }

    return {
      ...base,
      settlementTxHash: log.transactionHash,
      teeSignerAddress,
      settledAmount,
      status: STATUS.AUTHORIZED_AND_SETTLED,
      warnings,
    }
  }

  // Settlement event(s) for this user exist, but none could be confidently
  // tied to this specific provider. Report the ambiguity plainly instead
  // of guessing which one, if any, was "probably" ours.
  return {
    ...base,
    settlementTxHash: null,
    teeSignerAddress: null,
    settledAmount: null,
    status: STATUS.AUTHORIZED_SETTLEMENT_UNCORRELATED,
    warnings: [],
    uncorrelatedCandidates: uncorrelated,
  }
}

module.exports = { reconcile, STATUS }

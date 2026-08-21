const { TOPICS } = require('./constants')
const { strip0x, readWord, wordToAddress, wordToBigInt, wordToBool, decodeDynamicStringAt } = require('./abiCodec')

/**
 * WarrantModule.TransferExecuted(executor indexed, warrantId indexed, provider indexed, serviceName, amount)
 *
 * All three addresses/ids are indexed, so they live in topics[1..3]. The
 * data word holds the two non-indexed fields in declaration order per
 * standard ABI head/tail encoding: word0 is the *offset* to the dynamic
 * `serviceName` string (not the string itself), word1 is `amount` (static,
 * inline), and the string's [length, bytes] sit at the byte offset word0
 * actually contains. Verified against the real TransferExecuted log from
 * Track A's executeTransfer transaction (tx 0x635cd6cc...) before being
 * trusted here — see test/fixtures/trackA-funding-receipt.json.
 */
function decodeTransferExecuted(log) {
  const data = strip0x(log.data)
  const topics = log.topics.map(strip0x)
  const serviceNameOffset = Number(wordToBigInt(readWord(data, 0)))
  return {
    executor: wordToAddress(topics[1]),
    warrantId: wordToBigInt(topics[2]),
    provider: wordToAddress(topics[3]),
    amount: wordToBigInt(readWord(data, 1)),
    serviceName: decodeDynamicStringAt(data, serviceNameOffset),
  }
}

/**
 * WarrantRegistry.SpendRecorded(warrantId indexed, provider indexed, serviceName, amount, newSpentAmount, spender)
 *
 * Same head/tail pattern as above, with four non-indexed fields: word0 is
 * the offset to `serviceName`, words 1-3 are `amount`, `newSpentAmount`,
 * `spender` inline, and the string sits at the offset word0 gives.
 * Verified against the real SpendRecorded log from the same transaction.
 */
function decodeSpendRecorded(log) {
  const data = strip0x(log.data)
  const topics = log.topics.map(strip0x)
  const serviceNameOffset = Number(wordToBigInt(readWord(data, 0)))
  return {
    warrantId: wordToBigInt(topics[1]),
    provider: wordToAddress(topics[2]),
    amount: wordToBigInt(readWord(data, 1)),
    newSpentAmount: wordToBigInt(readWord(data, 2)),
    spender: wordToAddress(readWord(data, 3)),
    serviceName: decodeDynamicStringAt(data, serviceNameOffset),
  }
}

/**
 * InferenceServing.BalanceUpdated(user indexed, provider indexed, amount, pendingRefund)
 */
function decodeBalanceUpdated(log) {
  const data = strip0x(log.data)
  const topics = log.topics.map(strip0x)
  return {
    user: wordToAddress(topics[1]),
    provider: wordToAddress(topics[2]),
    amount: wordToBigInt(readWord(data, 0)),
    pendingRefund: wordToBigInt(readWord(data, 1)),
  }
}

/**
 * InferenceServing.TEESettlementResult(user indexed, status, unsettledAmount)
 *
 * Deliberately does NOT report `provider` — this event does not carry one.
 * See reconcile.js for how provider correlation is established without it.
 */
function decodeTEESettlementResult(log) {
  const data = strip0x(log.data)
  const topics = log.topics.map(strip0x)
  return {
    user: wordToAddress(topics[1]),
    status: Number(wordToBigInt(readWord(data, 0))),
    unsettledAmount: wordToBigInt(readWord(data, 1)),
  }
}

/**
 * InferenceServing.ProviderTEESignerAcknowledged(provider indexed, teeSignerAddress indexed, acknowledged)
 */
function decodeProviderTEESignerAcknowledged(log) {
  const data = strip0x(log.data)
  const topics = log.topics.map(strip0x)
  return {
    provider: wordToAddress(topics[1]),
    teeSignerAddress: wordToAddress(topics[2]),
    acknowledged: wordToBool(readWord(data, 0)),
  }
}

const DECODERS_BY_TOPIC0 = {
  [TOPICS.TRANSFER_EXECUTED]: decodeTransferExecuted,
  [TOPICS.SPEND_RECORDED]: decodeSpendRecorded,
  [TOPICS.BALANCE_UPDATED]: decodeBalanceUpdated,
  [TOPICS.TEE_SETTLEMENT_RESULT]: decodeTEESettlementResult,
  [TOPICS.PROVIDER_TEE_SIGNER_ACKNOWLEDGED]: decodeProviderTEESignerAcknowledged,
}

/** Finds and decodes the first log matching `topic0`, or returns null. */
function findAndDecode(logs, topic0) {
  const decoder = DECODERS_BY_TOPIC0[topic0]
  const log = logs.find((l) => l.topics && l.topics[0] && l.topics[0].toLowerCase() === topic0.toLowerCase())
  return log ? { log, decoded: decoder(log) } : null
}

/** Finds and decodes every log matching `topic0`, in the order given. */
function findAllAndDecode(logs, topic0) {
  const decoder = DECODERS_BY_TOPIC0[topic0]
  return logs
    .filter((l) => l.topics && l.topics[0] && l.topics[0].toLowerCase() === topic0.toLowerCase())
    .map((log) => ({ log, decoded: decoder(log) }))
}

module.exports = {
  decodeTransferExecuted,
  decodeSpendRecorded,
  decodeBalanceUpdated,
  decodeTEESettlementResult,
  decodeProviderTEESignerAcknowledged,
  findAndDecode,
  findAllAndDecode,
}

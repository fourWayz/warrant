const test = require('node:test')
const assert = require('node:assert/strict')

const { reconcile, reconcileWarrant, STATUS } = require('../src/reconcile')
const { createFakeChainReader } = require('./fakeChainReader')

const trackAFundingReceipt = require('./fixtures/trackA-funding-receipt.json')
const settledFixture = require('./fixtures/settled-synthetic.json')
const uncorrelatedFixture = require('./fixtures/uncorrelated-synthetic.json')

// Real, live-verified addresses from M0-M3 — see deployments/testnet.json
// and docs/m3-tracks.md.
const MODULE = '0xf47E11f9E499994C96b0C2e9ce1b7978db9416d8'
const INFERENCE_SERVING = '0xa79F4c8311FF93C06b8CfB403690cc987c93F91E'
const SAFE = '0x7F11f64A7d470D2B0a49cAc36837ffa49f8c63e9'
const REAL_FUNDING_TX = '0x635cd6cca736a2df02e8734f5b8fdf6ac54fb795e83356b40207fbd28cea68d2'
const SAFE_GETTER_SELECTOR = '0x186f0354'

function safeGetterResponse() {
  return '0x000000000000000000000000' + SAFE.slice(2).toLowerCase()
}

test('AUTHORIZED_ONLY — real Track A funding tx, no settlement anywhere', async () => {
  const reader = createFakeChainReader({
    receipts: { [REAL_FUNDING_TX]: trackAFundingReceipt },
    callResponses: { [`${MODULE.toLowerCase()}:${SAFE_GETTER_SELECTOR}`]: safeGetterResponse() },
    logs: [], // no TEESettlementResult events exist anywhere for this safe
  })

  const report = await reconcile(reader, {
    transferTxHash: REAL_FUNDING_TX,
    moduleAddress: MODULE,
    inferenceServingAddress: INFERENCE_SERVING,
  })

  assert.equal(report.status, STATUS.AUTHORIZED_ONLY)
  assert.equal(report.warrantId, 1n)
  assert.equal(report.provider.toLowerCase(), '0x87a13337f0d4b2b08cce9189dbe9555690828ed4')
  assert.equal(report.authorizedAmount, 10000000000000000n)
  assert.equal(report.settlementTxHash, null)
  assert.equal(report.teeSignerAddress, null)
  assert.equal(report.settledAmount, null)
})

test('AUTHORIZED_AND_SETTLED — synthetic settlement correlated by calldata position, TEE signer from a real-shaped acknowledgment event', async () => {
  const reader = createFakeChainReader({
    receipts: {
      [REAL_FUNDING_TX]: trackAFundingReceipt,
      [settledFixture.settlementTxHash]: settledFixture.receipt,
    },
    transactions: { [settledFixture.settlementTxHash]: settledFixture.tx },
    callResponses: { [`${MODULE.toLowerCase()}:${SAFE_GETTER_SELECTOR}`]: safeGetterResponse() },
    logs: [...settledFixture.receipt.logs, settledFixture.teeSignerAcknowledgedLog],
  })

  const report = await reconcile(reader, {
    transferTxHash: REAL_FUNDING_TX,
    moduleAddress: MODULE,
    inferenceServingAddress: INFERENCE_SERVING,
  })

  assert.equal(report.status, STATUS.AUTHORIZED_AND_SETTLED)
  assert.equal(report.settlementTxHash, settledFixture.settlementTxHash)
  assert.equal(report.teeSignerAddress.toLowerCase(), settledFixture.expectedTeeSignerAddress.toLowerCase())
  assert.equal(report.settledAmount.toString(), settledFixture.expectedSettledAmount)
  // Not model/output/policy claims — only what the fields actually are.
  assert.equal('modelVerified' in report, false)
  assert.equal('outputVerified' in report, false)
  assert.equal('policyFollowed' in report, false)
})

test('AUTHORIZED_SETTLEMENT_UNCORRELATED — a settlement exists for the Safe but not for this provider', async () => {
  const reader = createFakeChainReader({
    receipts: {
      [REAL_FUNDING_TX]: trackAFundingReceipt,
      [uncorrelatedFixture.settlementTxHash]: uncorrelatedFixture.receipt,
    },
    transactions: { [uncorrelatedFixture.settlementTxHash]: uncorrelatedFixture.tx },
    callResponses: { [`${MODULE.toLowerCase()}:${SAFE_GETTER_SELECTOR}`]: safeGetterResponse() },
    logs: [...uncorrelatedFixture.receipt.logs],
  })

  const report = await reconcile(reader, {
    transferTxHash: REAL_FUNDING_TX,
    moduleAddress: MODULE,
    inferenceServingAddress: INFERENCE_SERVING,
  })

  assert.equal(report.status, STATUS.AUTHORIZED_SETTLEMENT_UNCORRELATED)
  assert.equal(report.settlementTxHash, null, 'must not guess a settlement tx it cannot confidently attribute')
  assert.equal(report.teeSignerAddress, null)
  assert.equal(report.settledAmount, null)
  assert.ok(report.uncorrelatedCandidates.length >= 1)
})

test('fails safely, not silently, when transferTxHash does not exist', async () => {
  const reader = createFakeChainReader({ receipts: {} })
  await assert.rejects(
    () => reconcile(reader, { transferTxHash: '0x' + 'ff'.repeat(32), moduleAddress: MODULE, inferenceServingAddress: INFERENCE_SERVING }),
    /not found on chain/
  )
})

test('fails safely when the transaction has no TransferExecuted event from the given module', async () => {
  const unrelatedTx = '0x' + 'ab'.repeat(32)
  const reader = createFakeChainReader({
    receipts: { [unrelatedTx]: { status: '0x1', blockNumber: '0x1', logs: [] } },
  })
  await assert.rejects(
    () => reconcile(reader, { transferTxHash: unrelatedTx, moduleAddress: MODULE, inferenceServingAddress: INFERENCE_SERVING }),
    /no TransferExecuted event/
  )
})

test('fails safely on a reverted transaction rather than reconciling it', async () => {
  const revertedTx = '0x' + 'cd'.repeat(32)
  const reader = createFakeChainReader({
    receipts: { [revertedTx]: { status: '0x0', blockNumber: '0x1', logs: [] } },
  })
  await assert.rejects(
    () => reconcile(reader, { transferTxHash: revertedTx, moduleAddress: MODULE, inferenceServingAddress: INFERENCE_SERVING }),
    /did not succeed/
  )
})

test('repeated reconciliation against the same data produces identical output', async () => {
  const reader = createFakeChainReader({
    receipts: { [REAL_FUNDING_TX]: trackAFundingReceipt },
    callResponses: { [`${MODULE.toLowerCase()}:${SAFE_GETTER_SELECTOR}`]: safeGetterResponse() },
    logs: [],
  })
  const params = { transferTxHash: REAL_FUNDING_TX, moduleAddress: MODULE, inferenceServingAddress: INFERENCE_SERVING }

  const first = await reconcile(reader, params)
  const second = await reconcile(reader, params)

  assert.deepEqual(first, second)
})

test('multiple providers / multiple warrants on the same Safe reconcile independently', async () => {
  // A second, synthetic TransferExecuted for a *different* warrant and
  // provider on the same real Safe — constructed with the same verified
  // event layout as the real Track A log, not a real transaction.
  const SECOND_WARRANT_TX = '0x' + 'ee'.repeat(32)
  const OTHER_PROVIDER = '0xA02b95Aa6886b1116C4f334eDe00381511E31A09'
  const secondReceipt = {
    status: '0x1',
    blockNumber: '0x3126d30',
    logs: [
      {
        address: MODULE,
        topics: [
          '0x0425e19fb2c0206dac5e56431bff70d1977603f5a3b7691fff6465870874d8c9',
          '0x000000000000000000000000e18638fd5d1e70f6f460e5da47914ff7f6a5f1b1',
          '0x0000000000000000000000000000000000000000000000000000000000000002',
          '0x000000000000000000000000' + OTHER_PROVIDER.slice(2).toLowerCase(),
        ],
        data:
          '0x000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000470de4df820000000000000000000000000000000000000000000000000000000000000000000e696e666572656e63652d76312e30000000000000000000000000000000000000',
      },
    ],
  }

  const reader = createFakeChainReader({
    receipts: {
      [REAL_FUNDING_TX]: trackAFundingReceipt,
      [SECOND_WARRANT_TX]: secondReceipt,
    },
    callResponses: { [`${MODULE.toLowerCase()}:${SAFE_GETTER_SELECTOR}`]: safeGetterResponse() },
    logs: [],
  })

  const first = await reconcile(reader, { transferTxHash: REAL_FUNDING_TX, moduleAddress: MODULE, inferenceServingAddress: INFERENCE_SERVING })
  const second = await reconcile(reader, { transferTxHash: SECOND_WARRANT_TX, moduleAddress: MODULE, inferenceServingAddress: INFERENCE_SERVING })

  assert.equal(first.warrantId, 1n)
  assert.equal(first.provider.toLowerCase(), '0x87a13337f0d4b2b08cce9189dbe9555690828ed4')
  assert.equal(second.warrantId, 2n)
  assert.equal(second.provider.toLowerCase(), OTHER_PROVIDER.toLowerCase())
  assert.equal(second.authorizedAmount, 20000000000000000n)
  assert.equal(first.status, STATUS.AUTHORIZED_ONLY)
  assert.equal(second.status, STATUS.AUTHORIZED_ONLY)
})

test('reconcileWarrant finds and reconciles every transfer for a warrant via one indexed log query', async () => {
  const transferLog = trackAFundingReceipt.logs.find(
    (l) => l.topics[0].toLowerCase() === '0x0425e19fb2c0206dac5e56431bff70d1977603f5a3b7691fff6465870874d8c9'
  )
  const reader = createFakeChainReader({
    receipts: { [REAL_FUNDING_TX]: trackAFundingReceipt },
    callResponses: { [`${MODULE.toLowerCase()}:${SAFE_GETTER_SELECTOR}`]: safeGetterResponse() },
    logs: [transferLog], // this is exactly what an indexed eth_getLogs(warrantId=1) query returns
  })

  const { summary, reports } = await reconcileWarrant(reader, {
    warrantId: 1,
    moduleAddress: MODULE,
    inferenceServingAddress: INFERENCE_SERVING,
  })

  assert.equal(summary.warrantId, 1n)
  assert.equal(summary.transferCount, 1)
  assert.equal(summary.totalAuthorized, 10000000000000000n)
  assert.equal(summary.totalSettled, 0n)
  assert.equal(summary.countByStatus[STATUS.AUTHORIZED_ONLY], 1)
  assert.equal(reports.length, 1)
  assert.equal(reports[0].transferTxHash, REAL_FUNDING_TX)
})

test('reconcileWarrant reports an empty summary for a warrant with no transfers', async () => {
  const reader = createFakeChainReader({ logs: [] })
  const { summary, reports } = await reconcileWarrant(reader, {
    warrantId: 999,
    moduleAddress: MODULE,
    inferenceServingAddress: INFERENCE_SERVING,
  })
  assert.equal(summary.transferCount, 0)
  assert.equal(summary.totalAuthorized, 0n)
  assert.deepEqual(reports, [])
})

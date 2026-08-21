const test = require('node:test')
const assert = require('node:assert/strict')
const { findAndDecode } = require('../src/events')
const { TOPICS } = require('../src/constants')

// Every value asserted here was cross-checked against the live testnet
// state during M3/M4 before being trusted in this test — see
// docs/m3-tracks.md for the transaction and docs/m4-reconciliation.md for
// the decoder verification record.
const trackAFundingReceipt = require('./fixtures/trackA-funding-receipt.json')

test('decodes the real TransferExecuted log from Track A', () => {
  const { decoded } = findAndDecode(trackAFundingReceipt.logs, TOPICS.TRANSFER_EXECUTED)
  assert.equal(decoded.executor, '0xe18638fd5d1e70f6f460e5da47914ff7f6a5f1b1')
  assert.equal(decoded.warrantId, 1n)
  assert.equal(decoded.provider, '0x87a13337f0d4b2b08cce9189dbe9555690828ed4')
  assert.equal(decoded.amount, 10000000000000000n)
  assert.equal(decoded.serviceName, 'inference-v1.0')
})

test('decodes the real SpendRecorded log from Track A', () => {
  const { decoded } = findAndDecode(trackAFundingReceipt.logs, TOPICS.SPEND_RECORDED)
  assert.equal(decoded.warrantId, 1n)
  assert.equal(decoded.provider, '0x87a13337f0d4b2b08cce9189dbe9555690828ed4')
  assert.equal(decoded.amount, 10000000000000000n)
  assert.equal(decoded.newSpentAmount, 10000000000000000n)
  assert.equal(decoded.spender, '0xe18638fd5d1e70f6f460e5da47914ff7f6a5f1b1')
  assert.equal(decoded.serviceName, 'inference-v1.0')
})

test('decodes the real BalanceUpdated log from Track A', () => {
  const { decoded } = findAndDecode(trackAFundingReceipt.logs, TOPICS.BALANCE_UPDATED)
  assert.equal(decoded.user, '0x7f11f64a7d470d2b0a49cac36837ffa49f8c63e9')
  assert.equal(decoded.provider, '0x87a13337f0d4b2b08cce9189dbe9555690828ed4')
  assert.equal(decoded.amount, 10000000000000000n)
  assert.equal(decoded.pendingRefund, 0n)
})

test('findAndDecode returns null when no matching log exists', () => {
  const result = findAndDecode(trackAFundingReceipt.logs, TOPICS.TEE_SETTLEMENT_RESULT)
  assert.equal(result, null)
})

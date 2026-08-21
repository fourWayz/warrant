const test = require('node:test')
const assert = require('node:assert/strict')
const { computeContentHash, archive, archiveEnvelope, archiveReport } = require('../src/storageArchive')

test('computeContentHash is deterministic', () => {
  const a = computeContentHash('hello')
  const b = computeContentHash('hello')
  assert.equal(a, b)
  assert.notEqual(a, computeContentHash('hello!'))
})

test('archive without an uploader returns a real hash and a null storage ref, never a fake one', async () => {
  const result = await archive('some content')
  assert.equal(result.contentHash, computeContentHash('some content'))
  assert.equal(result.storageRef, null)
})

test('archive with an injected uploader returns whatever the uploader reports, hash unaffected', async () => {
  const fakeUpload = async (buf) => ({ storageRef: `fake://${buf.length}` })
  const result = await archive('some content', { upload: fakeUpload })
  assert.equal(result.contentHash, computeContentHash('some content'))
  assert.equal(result.storageRef, 'fake://12')
})

test('archiveReport serializes bigint fields before hashing rather than throwing', async () => {
  const report = { warrantId: 1n, authorizedAmount: 10000000000000000n, status: 'AUTHORIZED_ONLY' }
  const result = await archiveReport(report)
  assert.ok(result.contentHash.startsWith('0x'))
  assert.equal(result.storageRef, null)
})

test('archiveEnvelope hashes the JSON-serialized envelope', async () => {
  const envelope = { agentId: '0x1', warrantId: '1', provider: '0x2', model: 'test', inputHash: '0x3', maxCost: '1', nonce: '0', expiry: '1' }
  const result = await archiveEnvelope(envelope)
  assert.equal(result.contentHash, computeContentHash(JSON.stringify(envelope)))
})

// Archival adapter — deliberately isolated from reconcile.js. Nothing in
// the reconciliation core imports this module or knows it exists; a report
// is fully computed before archival is ever considered, and reconciliation
// correctness never depends on whether archival succeeds, is configured,
// or is called at all.
//
// Scope, stated plainly: this computes a local, tamper-evident content
// hash and defines the upload boundary. It does NOT perform a real upload
// to 0G Storage — doing that requires 0G's own Storage SDK (for its
// specific Merkle-root content addressing scheme), which is intentionally
// not added as a dependency in this milestone. Wiring in a real uploader
// later is a change entirely inside this one file; it cannot touch
// reconcile.js, abiCodec.js, events.js, or chainReader.js by construction.
//
// This module must never be described as "proving" the archived content is
// true. It proves only that whatever bytes are retrieved later match the
// hash computed here — tamper-evidence, not correctness.

const { createHash } = require('crypto')

/** A stand-in reference type until a real uploader is wired in. */
const NOT_ARCHIVED = null

/**
 * Computes a local SHA-256 content hash for `content` (a string or Buffer).
 * This is Warrant's own integrity commitment, independent of whatever
 * content-addressing scheme 0G Storage uses internally for its Merkle
 * root — the two are not claimed to be the same value.
 */
function computeContentHash(content) {
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8')
  return '0x' + createHash('sha256').update(buf).digest('hex')
}

/**
 * Archives `content` via an injected `upload` function, or records that no
 * uploader was configured. The content hash is always computed locally,
 * regardless of whether upload happens — that hash, not the storage
 * reference, is what anything should ever be asked to trust.
 *
 * @param {string|Buffer} content
 * @param {{ upload?: (content: Buffer) => Promise<{ storageRef: string }> }} [options]
 * @returns {Promise<{ contentHash: string, storageRef: string|null }>}
 */
async function archive(content, options = {}) {
  const contentHash = computeContentHash(content)
  if (!options.upload) {
    return { contentHash, storageRef: NOT_ARCHIVED }
  }
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8')
  const { storageRef } = await options.upload(buf)
  return { contentHash, storageRef }
}

/**
 * Archives a signed agent intent envelope and/or a reconciliation report.
 * Thin convenience wrapper over `archive` — kept separate so callers don't
 * need to know these are JSON-serialized before hashing.
 */
async function archiveEnvelope(envelope, options) {
  return archive(JSON.stringify(envelope), options)
}

async function archiveReport(report, options) {
  const serializable = JSON.parse(
    JSON.stringify(report, (_key, value) => (typeof value === 'bigint' ? value.toString() : value))
  )
  return archive(JSON.stringify(serializable), options)
}

module.exports = { computeContentHash, archive, archiveEnvelope, archiveReport }

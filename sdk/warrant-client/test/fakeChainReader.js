// A minimal fake implementing the same interface as chainReader.js's real,
// JSON-RPC-backed reader, so reconcile.js's logic can be tested with zero
// network access and fully deterministic fixture data. No test ever needs
// this to fake an off-chain provider's HTTP response — only chain state.

function createFakeChainReader({ receipts = {}, transactions = {}, logs = [], callResponses = {} }) {
  const norm = (h) => (h || '').toLowerCase()

  return {
    async getTransactionReceipt(txHash) {
      return receipts[norm(txHash)] ?? null
    },
    async getTransactionByHash(txHash) {
      return transactions[norm(txHash)] ?? null
    },
    async getLogs({ address, topics }) {
      return logs.filter((log) => {
        if (address && norm(log.address) !== norm(address)) return false
        return topics.every((t, i) => t == null || norm(log.topics[i]) === norm(t))
      })
    },
    async call({ to, data }) {
      const key = `${norm(to)}:${norm(data)}`
      if (!(key in callResponses)) {
        throw new Error(`fake chain reader: no call response configured for ${key}`)
      }
      return callResponses[key]
    },
  }
}

module.exports = { createFakeChainReader }

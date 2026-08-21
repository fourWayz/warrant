// Real, JSON-RPC-backed implementation of the chain reader interface
// reconcile.js depends on. Zero dependencies: Node's built-in `fetch` is
// all this needs. This is the only file in the library that talks to a
// network — everything in reconcile.js takes a reader as a parameter and
// never imports this module, so tests never need a live RPC endpoint.

let nextId = 1

async function rpcCall(rpcUrl, method, params) {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, params }),
  })
  const body = await res.json()
  if (body.error) {
    throw new Error(`RPC error calling ${method}: ${body.error.message}`)
  }
  return body.result
}

/**
 * Creates a chain reader backed by a real 0G JSON-RPC endpoint.
 *
 * The interface is intentionally the minimum reconcile.js needs — nothing
 * here decides anything, it only fetches. All decoding and correlation
 * logic lives in reconcile.js, independent of how the raw data arrived.
 */
function createJsonRpcChainReader(rpcUrl) {
  return {
    async getTransactionReceipt(txHash) {
      return rpcCall(rpcUrl, 'eth_getTransactionReceipt', [txHash])
    },
    async getTransactionByHash(txHash) {
      return rpcCall(rpcUrl, 'eth_getTransactionByHash', [txHash])
    },
    async getLogs({ address, topics, fromBlock, toBlock }) {
      return rpcCall(rpcUrl, 'eth_getLogs', [
        {
          address,
          topics,
          fromBlock: fromBlock ?? '0x0',
          toBlock: toBlock ?? 'latest',
        },
      ])
    },
    async call({ to, data }, blockTag) {
      return rpcCall(rpcUrl, 'eth_call', [{ to, data }, blockTag ?? 'latest'])
    },
  }
}

module.exports = { createJsonRpcChainReader }

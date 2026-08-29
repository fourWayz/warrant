import { createPublicClient, http } from 'viem'
import { MAINNET, TESTNET, type NetworkConfig } from './networks'

const clients = new Map<string, ReturnType<typeof createPublicClient>>()

export function publicClientFor(network: NetworkConfig) {
  const existing = clients.get(network.key)
  if (existing) return existing
  const client = createPublicClient({ chain: network.chain, transport: http(network.rpcUrl) })
  clients.set(network.key, client)
  return client
}

export const mainnetClient = publicClientFor(MAINNET)
export const testnetClient = publicClientFor(TESTNET)

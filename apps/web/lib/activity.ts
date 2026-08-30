import { warrantModuleAbi, warrantRegistryAbi } from './abis'
import { publicClientFor } from './viemClients'
import type { NetworkConfig } from './networks'

export interface ActivityEntry {
  contract: 'registry' | 'module'
  eventName: string
  blockNumber: bigint
  transactionHash: `0x${string}`
  logIndex: number
  args: Record<string, unknown>
  timestamp: number | null
}

const REGISTRY_EVENTS = ['WarrantCreated', 'WarrantProviderSet', 'WarrantRevoked', 'SpendRecorded'] as const
const MODULE_EVENTS = ['ExecutorSet', 'TransferExecuted'] as const

/**
 * Pulls every Warrant-related event for one warrant across both contracts,
 * via indexed eth_getLogs queries (not a block-range scan), and sorts them
 * into one chronological timeline. Read-only, same guarantee reconcile.js
 * carries: this can only ever misreport a display, never move funds.
 */
export async function fetchWarrantActivity(network: NetworkConfig, warrantId: bigint): Promise<ActivityEntry[]> {
  const client = publicClientFor(network)

  const registryLogs = await Promise.all(
    REGISTRY_EVENTS.map((eventName) =>
      client.getContractEvents({
        address: network.contracts.registry,
        abi: warrantRegistryAbi,
        eventName,
        args: { warrantId } as never,
        fromBlock: 0n,
        toBlock: 'latest',
      })
    )
  )

  const moduleLogs = await Promise.all(
    MODULE_EVENTS.map((eventName) =>
      client.getContractEvents({
        address: network.contracts.module,
        abi: warrantModuleAbi,
        eventName,
        args: { warrantId } as never,
        fromBlock: 0n,
        toBlock: 'latest',
      })
    )
  )

  const flat = [
    ...registryLogs.flat().map((log) => ({ contract: 'registry' as const, log })),
    ...moduleLogs.flat().map((log) => ({ contract: 'module' as const, log })),
  ]

  flat.sort((a, b) => {
    const blockDiff = a.log.blockNumber! - b.log.blockNumber!
    if (blockDiff !== 0n) return blockDiff > 0n ? 1 : -1
    return a.log.logIndex! - b.log.logIndex!
  })

  const blockNumbers = Array.from(new Set(flat.map((f) => f.log.blockNumber!)))
  const blocks = await Promise.all(
    blockNumbers.map((bn) => client.getBlock({ blockNumber: bn }).catch(() => null))
  )
  const timestampByBlock = new Map(blockNumbers.map((bn, i) => [bn, blocks[i] ? Number(blocks[i]!.timestamp) : null]))

  return flat.map(({ contract, log }) => ({
    contract,
    eventName: (log as { eventName: string }).eventName,
    blockNumber: log.blockNumber!,
    transactionHash: log.transactionHash!,
    logIndex: log.logIndex!,
    args: (log as { args: Record<string, unknown> }).args,
    timestamp: timestampByBlock.get(log.blockNumber!) ?? null,
  }))
}

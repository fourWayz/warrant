'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ExternalLink, Loader2 } from 'lucide-react'
import { fetchWarrantActivity, type ActivityEntry } from '@/lib/activity'
import { formatA0GI, formatTimestamp, truncateAddress } from '@/lib/format'
import { explorerTxUrl, type NetworkConfig } from '@/lib/networks'

const EVENT_LABEL: Record<string, string> = {
  WarrantCreated: 'Warrant Created',
  WarrantProviderSet: 'Provider Allowlist Updated',
  WarrantRevoked: 'Warrant Revoked',
  SpendRecorded: 'Spend Recorded (Registry)',
  ExecutorSet: 'Executor Authorized',
  TransferExecuted: 'Transfer Executed',
}

function summarize(entry: ActivityEntry): string {
  const a = entry.args
  switch (entry.eventName) {
    case 'WarrantCreated':
      return `cap ${formatA0GI(a.maxTotalSpend as bigint)} · owner ${truncateAddress(a.owner as string)}`
    case 'WarrantProviderSet':
      return `${a.allowed ? 'allowed' : 'removed'} ${truncateAddress(a.provider as string)}`
    case 'WarrantRevoked':
      return `by ${truncateAddress(a.revokedBy as string)}`
    case 'SpendRecorded':
      return `${formatA0GI(a.amount as bigint)} → ${truncateAddress(a.provider as string)} (new total ${formatA0GI(a.newSpentAmount as bigint)})`
    case 'ExecutorSet':
      return `executor ${truncateAddress(a.executor as string)}`
    case 'TransferExecuted':
      return `${formatA0GI(a.amount as bigint)} → ${truncateAddress(a.provider as string)}`
    default:
      return ''
  }
}

export function ActivityTimeline({ network, warrantId }: { network: NetworkConfig; warrantId: bigint }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['activity', network.key, warrantId.toString()],
    queryFn: () => fetchWarrantActivity(network, warrantId),
  })

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-ink-faint">
        <Loader2 size={14} className="animate-spin" /> reading event history from {network.label}…
      </div>
    )
  }
  if (isError) {
    return <div className="py-8 text-sm text-block">Could not read event history from the RPC endpoint.</div>
  }
  if (!data || data.length === 0) {
    return <div className="py-8 text-sm text-ink-faint">No events found for this warrant.</div>
  }

  return (
    <ol className="relative space-y-0 border-l border-ground-border-strong pl-6">
      {data.map((entry, i) => (
        <motion.li
          key={`${entry.transactionHash}-${entry.logIndex}`}
          initial={{ opacity: 0, x: -8 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.04 }}
          className="relative pb-6 last:pb-0"
        >
          <span className="absolute -left-[29px] top-1 h-2.5 w-2.5 rounded-full border-2 border-ground bg-accent" />
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <span className="text-sm font-medium text-ink">{EVENT_LABEL[entry.eventName] ?? entry.eventName}</span>
            <span className="text-xs text-ink-faint">{entry.timestamp ? formatTimestamp(entry.timestamp) : `block ${entry.blockNumber}`}</span>
          </div>
          <div className="mt-0.5 font-mono text-xs text-ink-muted">{summarize(entry)}</div>
          <a
            href={explorerTxUrl(network, entry.transactionHash)}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs text-accent hover:text-accent-bright"
          >
            {truncateAddress(entry.transactionHash, 6)} <ExternalLink size={10} />
          </a>
        </motion.li>
      ))}
    </ol>
  )
}

'use client'

import { motion } from 'framer-motion'
import { formatA0GI } from '@/lib/format'

export function BudgetMeter({ spent, cap }: { spent: bigint; cap: bigint }) {
  const pct = cap > 0n ? Math.min(100, Number((spent * 10000n) / cap) / 100) : 0
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="font-mono text-sm tabular-nums text-ink">
          {formatA0GI(spent)} <span className="text-ink-faint">/ {formatA0GI(cap)} spent</span>
        </span>
        <span className="font-mono text-xs tabular-nums text-ink-faint">{pct.toFixed(1)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ground-raised">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="h-full rounded-full bg-accent"
        />
      </div>
    </div>
  )
}

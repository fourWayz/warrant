'use client'

import { motion } from 'framer-motion'
import { ArrowRight, ShieldOff, ShieldCheck } from 'lucide-react'
import { Card } from '@/components/ui/card'

export function WhyWarrant() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
      >
        <Card className="h-full border-block/25 bg-block-wash/40 p-5">
          <div className="mb-4 flex items-center gap-2 text-block">
            <ShieldOff size={16} />
            <span className="text-xs font-semibold uppercase tracking-wider">Without Warrant</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 font-mono text-[13px] text-ink-muted">
            <span>Agent key</span>
            <ArrowRight size={14} className="text-ink-faint" />
            <span>LedgerManager</span>
            <ArrowRight size={14} className="text-ink-faint" />
            <span className="text-block">any provider, any amount</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-ink-muted">
            Whoever holds the agent&apos;s key can call{' '}
            <code className="rounded bg-ground-raised px-1 py-0.5 text-xs">transferFund</code> directly — the owner
            has no on-chain say in where funds go once the key exists.
          </p>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.08 }}
      >
        <Card className="h-full border-allow/25 bg-allow-wash/40 p-5">
          <div className="mb-4 flex items-center gap-2 text-allow">
            <ShieldCheck size={16} />
            <span className="text-xs font-semibold uppercase tracking-wider">With Warrant</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 font-mono text-[13px] text-ink-muted">
            <span>Owner policy</span>
            <ArrowRight size={14} className="text-ink-faint" />
            <span>Safe</span>
            <ArrowRight size={14} className="text-ink-faint" />
            <span>WarrantModule</span>
            <ArrowRight size={14} className="text-ink-faint" />
            <span>WarrantRegistry</span>
            <ArrowRight size={14} className="text-ink-faint" />
            <span className="text-allow">LedgerManager</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-ink-muted">
            The module cannot construct an arbitrary external call. Its only capability is one function —{' '}
            <code className="rounded bg-ground-raised px-1 py-0.5 text-xs">executeTransfer(provider, service, amount)</code>{' '}
            — checked against policy before it ever builds the underlying transfer.
          </p>
        </Card>
      </motion.div>
    </div>
  )
}

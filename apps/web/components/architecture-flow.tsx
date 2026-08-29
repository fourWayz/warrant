'use client'

import { motion } from 'framer-motion'
import { ArrowDown, CircleCheck, CircleX, Landmark, Shield, ShieldCheck, User, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'

const NODES = [
  { icon: User, label: 'Owner Policy', sub: 'providers · cap · expiry · revocation' },
  { icon: Wallet, label: 'Safe Agent Wallet', sub: 'the agent never holds the key' },
  { icon: Shield, label: 'WarrantModule', sub: 'no arbitrary target or calldata' },
  { icon: ShieldCheck, label: 'WarrantRegistry', sub: 'the policy check' },
]

function Connector({ delay }: { delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scaleY: 0 }}
      whileInView={{ opacity: 1, scaleY: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay, duration: 0.35, ease: 'easeOut' }}
      className="flex justify-center py-1 text-ink-faint"
    >
      <ArrowDown size={16} />
    </motion.div>
  )
}

export function ArchitectureFlow() {
  return (
    <div className="mx-auto max-w-md">
      {NODES.map((node, i) => (
        <div key={node.label}>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ delay: i * 0.08, duration: 0.4, ease: 'easeOut' }}
            className="flex items-center gap-3 rounded-lg border border-ground-border bg-ground-panel/70 px-4 py-3 shadow-subtle"
          >
            <node.icon size={17} className="shrink-0 text-accent" strokeWidth={1.75} />
            <div className="min-w-0">
              <div className="text-sm font-medium text-ink">{node.label}</div>
              <div className="truncate text-xs text-ink-faint">{node.sub}</div>
            </div>
          </motion.div>
          <Connector delay={i * 0.08 + 0.05} />
        </div>
      ))}

      {/* The enforcement gate — the one line in the whole architecture where
          a request is actually accepted or rejected. */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ delay: 0.4, duration: 0.45, ease: 'easeOut' }}
        className="relative my-1 rounded-lg border border-accent/40 bg-accent-wash px-4 py-4"
      >
        <div className="mb-2 text-center text-[11px] font-medium uppercase tracking-[0.2em] text-accent-bright">
          Enforcement boundary
        </div>
        <div className="flex items-center justify-center gap-6">
          <div className="flex items-center gap-1.5 text-allow">
            <CircleCheck size={16} />
            <span className="text-xs font-medium">ALLOW</span>
          </div>
          <div className="h-4 w-px bg-ground-border-strong" />
          <div className="flex items-center gap-1.5 text-block">
            <CircleX size={16} />
            <span className="text-xs font-medium">BLOCK</span>
          </div>
        </div>
        <p className="mt-2 text-center text-[11px] leading-relaxed text-ink-faint">
          provider allowed · within cap · not expired · not revoked · ownership unchanged
        </p>
      </motion.div>

      <Connector delay={0.5} />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ delay: 0.55, duration: 0.4, ease: 'easeOut' }}
        className="flex items-center gap-3 rounded-lg border border-ground-border bg-ground-panel/70 px-4 py-3 shadow-subtle"
      >
        <Landmark size={17} className="shrink-0 text-accent" strokeWidth={1.75} />
        <div>
          <div className="text-sm font-medium text-ink">0G LedgerManager</div>
          <div className="text-xs text-ink-faint">transferFund(provider, service, amount)</div>
        </div>
      </motion.div>
      <Connector delay={0.6} />
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ delay: 0.65, duration: 0.4, ease: 'easeOut' }}
        className={cn('rounded-lg border border-dashed border-ground-border-strong bg-ground-raised/40 px-4 py-3')}
      >
        <div className="text-sm font-medium text-ink">Compute Provider Account</div>
        <div className="mt-0.5 text-xs text-ink-faint">
          Native <span className="font-mono">settleFeesWithTEE</span> runs from here — provider-triggered,
          unmodified, outside Warrant&apos;s control.
        </div>
      </motion.div>
    </div>
  )
}

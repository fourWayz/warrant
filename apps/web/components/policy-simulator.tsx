'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Loader2, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { simulatePolicyCheck, type PolicyCheckResult } from '@/lib/simulate'
import type { NetworkConfig } from '@/lib/networks'

const CHECKLIST = [
  { key: 'exists', label: 'Warrant exists' },
  { key: 'ProviderNotAllowed', label: 'Provider allowed' },
  { key: 'BudgetExceeded', label: 'Within spend cap' },
  { key: 'WarrantExpired', label: 'Not expired' },
  { key: 'WarrantNotActive', label: 'Not revoked' },
  { key: 'WarrantStale', label: 'Ownership valid' },
]

type Phase = 'idle' | 'checking' | 'done'

// A plain address with no executor binding on any WarrantModule — used to
// honestly test warrants that were never wired up with setExecutor (every
// warrant created via /create, since that requires a Safe this demo does
// not control). Simulating against it correctly surfaces the real
// NotAuthorizedExecutor state rather than silently testing a different
// warrant's policy through the network's one known reference executor.
const UNBOUND_ACCOUNT = '0x000000000000000000000000000000000000b0b0' as const

export function PolicySimulator({ network, warrantId }: { network: NetworkConfig; warrantId: bigint }) {
  const isReferenceWarrant = warrantId === network.demoWarrant.id
  const simulateAs = isReferenceWarrant ? network.demoWarrant.executor : UNBOUND_ACCOUNT

  const [provider, setProvider] = useState<string>(network.demoWarrant.allowedProvider)
  const [amount, setAmount] = useState('0.01')
  const [phase, setPhase] = useState<Phase>('idle')
  const [revealed, setRevealed] = useState(0)
  const [result, setResult] = useState<PolicyCheckResult | null>(null)

  async function run() {
    setPhase('checking')
    setResult(null)
    setRevealed(0)

    const outcome = await simulatePolicyCheck(network, {
      provider: provider as `0x${string}`,
      serviceName: 'inference-v1.0',
      amountEther: amount,
      account: simulateAs,
    })

    // Reveal the checklist item-by-item; stop early on whichever condition
    // the real simulation actually failed, if it failed.
    const failIndex = outcome.allowed ? -1 : CHECKLIST.findIndex((c) => c.key === outcome.errorName)
    const stopAt = failIndex === -1 ? CHECKLIST.length : failIndex + 1

    for (let i = 1; i <= stopAt; i++) {
      await new Promise((r) => setTimeout(r, 220))
      setRevealed(i)
    }
    setResult(outcome)
    setPhase('done')
  }

  const failIndex = result && !result.allowed ? CHECKLIST.findIndex((c) => c.key === result.errorName) : -1

  return (
    <Card>
      <CardHeader>
        <CardTitle>Policy evaluation — live eth_call against {network.label}</CardTitle>
        <p className="text-xs text-ink-faint">
          {isReferenceWarrant ? (
            <>
              Runs the deployed WarrantModule&apos;s own check, simulated as the real bound executor. No gas spent,
              no state changed — the same guarantee <code className="font-mono">cast call</code> gives.
            </>
          ) : (
            <>
              This warrant has no executor bound to it yet — creating a warrant here doesn&apos;t call{' '}
              <code className="font-mono">setExecutor</code>, which requires that warrant&apos;s own Safe. The
              honest result below reflects that real state, not a demo limitation.
            </>
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <div>
            <label className="mb-1 block text-xs text-ink-muted">Provider</label>
            <Input value={provider} onChange={(e) => setProvider(e.target.value)} className="text-xs" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-muted">Amount (A0GI)</label>
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} className="w-28 text-xs" />
          </div>
          <div className="flex items-end">
            <Button onClick={run} disabled={phase === 'checking'}>
              {phase === 'checking' ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
              Evaluate
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className="text-xs text-ink-faint underline decoration-dotted hover:text-accent"
            onClick={() => setProvider('0x000000000000000000000000000000000000dEaD')}
          >
            try a disallowed provider
          </button>
          <span className="text-xs text-ink-faint">·</span>
          <button className="text-xs text-ink-faint underline decoration-dotted hover:text-accent" onClick={() => setAmount('1000')}>
            try an over-cap amount
          </button>
        </div>

        <AnimatePresence>
          {phase !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden rounded-md border border-ground-border bg-ground-raised/40 p-4"
            >
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Warrant check</div>
              <ul className="space-y-1.5">
                {CHECKLIST.map((item, i) => {
                  const isRevealed = i < revealed
                  const isFail = i === failIndex && result
                  if (!isRevealed) return null
                  return (
                    <motion.li
                      key={item.key}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-2 text-sm"
                    >
                      {isFail ? <XCircle size={15} className="text-block" /> : <CheckCircle2 size={15} className="text-allow" />}
                      <span className={isFail ? 'text-block' : 'text-ink'}>{item.label}</span>
                    </motion.li>
                  )
                })}
              </ul>

              {result && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`mt-4 flex items-start gap-2.5 rounded-md border p-3 ${
                    result.allowed ? 'border-allow/30 bg-allow-wash' : 'border-block/30 bg-block-wash'
                  }`}
                >
                  {result.allowed ? (
                    <ShieldCheck size={17} className="mt-0.5 shrink-0 text-allow" />
                  ) : (
                    <ShieldAlert size={17} className="mt-0.5 shrink-0 text-block" />
                  )}
                  <div>
                    <div className={`text-sm font-semibold ${result.allowed ? 'text-allow' : 'text-block'}`}>
                      {result.allowed ? 'AUTHORIZATION ALLOWED' : 'REQUEST BLOCKED'}
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{result.message}</p>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}

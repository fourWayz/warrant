'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
// @warrant/client is the project's own dependency-free reconciliation
// library (sdk/warrant-client) — reused here as a workspace package, not
// reimplemented. See docs/m4-reconciliation.md for what it does and does
// not claim.
import { reconcile, createJsonRpcChainReader } from '@warrant/client'
import { CheckCircle2, CircleHelp, ExternalLink, Loader2, SearchCode, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatA0GI } from '@/lib/format'
import { TESTNET, explorerTxUrl } from '@/lib/networks'

interface Report {
  warrantId: bigint
  transferTxHash: string
  provider: string
  authorizedAmount: bigint
  settlementTxHash: string | null
  teeSignerAddress: string | null
  settledAmount: bigint | null
  status: string
  warnings: string[]
  uncorrelatedCandidates?: { settlementTxHash: string; reason: string }[]
}

const EXAMPLE = {
  tx: TESTNET.referenceFundingTx!,
  module: TESTNET.contracts.module,
}

const STATUS_META: Record<string, { label: string; icon: typeof CheckCircle2; tone: 'allow' | 'block' | 'neutral'; blurb: string }> = {
  AUTHORIZED_ONLY: {
    label: 'AUTHORIZED_ONLY',
    icon: CircleHelp,
    tone: 'neutral',
    blurb: 'Funded, no native settlement observed — expected for a Safe-controlled transfer given the Compute compatibility finding.',
  },
  AUTHORIZED_AND_SETTLED: {
    label: 'AUTHORIZED_AND_SETTLED',
    icon: CheckCircle2,
    tone: 'allow',
    blurb: 'A native settlement was found and confidently correlated to this transfer.',
  },
  AUTHORIZED_SETTLEMENT_UNCORRELATED: {
    label: 'AUTHORIZED_SETTLEMENT_UNCORRELATED',
    icon: XCircle,
    tone: 'block',
    blurb: 'A settlement exists for this account but could not be confidently attributed to this provider — reported as ambiguous, not guessed.',
  },
}

export function VerifyPanel() {
  const [txHash, setTxHash] = useState('')
  const [moduleAddress, setModuleAddress] = useState('')
  const [rpcUrl, setRpcUrl] = useState(TESTNET.rpcUrl)
  const [inferenceServing, setInferenceServing] = useState(TESTNET.contracts.inferenceServing ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<Report | null>(null)
  const [isExample, setIsExample] = useState(false)

  function loadExample() {
    setTxHash(EXAMPLE.tx)
    setModuleAddress(EXAMPLE.module)
    setRpcUrl(TESTNET.rpcUrl)
    setInferenceServing(TESTNET.contracts.inferenceServing ?? '')
    setIsExample(true)
    setReport(null)
    setError(null)
  }

  async function runVerification(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setReport(null)
    try {
      const reader = createJsonRpcChainReader(rpcUrl)
      const result = await reconcile(reader, {
        transferTxHash: txHash.trim(),
        moduleAddress: moduleAddress.trim(),
        inferenceServingAddress: inferenceServing.trim(),
      })
      setReport(result as Report)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reconciliation failed.')
    } finally {
      setLoading(false)
    }
  }

  const meta = report ? STATUS_META[report.status] : null

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardContent className="pt-5">
          <form onSubmit={runVerification} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-muted">Transfer transaction hash</label>
              <Input
                required
                placeholder="0x…"
                value={txHash}
                onChange={(e) => {
                  setTxHash(e.target.value)
                  setIsExample(false)
                }}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-muted">WarrantModule address</label>
              <Input
                required
                placeholder="0x…"
                value={moduleAddress}
                onChange={(e) => {
                  setModuleAddress(e.target.value)
                  setIsExample(false)
                }}
              />
            </div>
            <details className="text-xs text-ink-faint">
              <summary className="cursor-pointer select-none text-ink-muted hover:text-ink">Advanced (RPC / InferenceServing)</summary>
              <div className="mt-2 space-y-2">
                <Input value={rpcUrl} onChange={(e) => setRpcUrl(e.target.value)} className="text-xs" />
                <Input value={inferenceServing} onChange={(e) => setInferenceServing(e.target.value)} className="text-xs" />
              </div>
            </details>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <SearchCode size={16} />}
                Reconcile
              </Button>
              <Button type="button" variant="secondary" onClick={loadExample}>
                Load verified example
              </Button>
              {isExample && <Badge variant="accent">LIVE GALILEO DATA</Badge>}
            </div>
          </form>
        </CardContent>
      </Card>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 rounded-md border border-block/30 bg-block-wash px-4 py-3 text-sm text-block"
          >
            Reconciliation failed, not guessed: {error}
          </motion.div>
        )}

        {report && meta && (
          <motion.div
            key={report.transferTxHash}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4"
          >
            <Card>
              <CardContent className="pt-5">
                <div className="mb-4 flex items-center gap-2">
                  <meta.icon
                    size={18}
                    className={meta.tone === 'allow' ? 'text-allow' : meta.tone === 'block' ? 'text-block' : 'text-ink-faint'}
                  />
                  <Badge variant={meta.tone}>{meta.label}</Badge>
                </div>
                <p className="mb-4 text-sm leading-relaxed text-ink-muted">{meta.blurb}</p>

                <dl className="space-y-2 text-sm">
                  <Row label="Warrant ID" value={report.warrantId.toString()} />
                  <Row
                    label="Transfer tx"
                    value={
                      <a
                        href={explorerTxUrl(TESTNET, report.transferTxHash)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-accent hover:text-accent-bright"
                      >
                        {report.transferTxHash.slice(0, 10)}… <ExternalLink size={11} />
                      </a>
                    }
                  />
                  <Row label="Provider" value={report.provider} mono />
                  <Row label="Authorized amount" value={formatA0GI(BigInt(report.authorizedAmount))} />
                  <Row label="Settlement tx" value={report.settlementTxHash ?? 'null'} mono />
                  <Row label="TEE signer" value={report.teeSignerAddress ?? 'null'} mono />
                  <Row label="Settled amount" value={report.settledAmount !== null ? formatA0GI(BigInt(report.settledAmount)) : 'n/a'} />
                </dl>

                {report.warnings?.length > 0 && (
                  <div className="mt-4 rounded-md border border-ground-border-strong bg-ground-raised/50 p-3 text-xs text-ink-faint">
                    {report.warnings.join('; ')}
                  </div>
                )}

                <p className="mt-4 border-t border-ground-border pt-3 text-xs leading-relaxed text-ink-faint">
                  This report states authorization and settlement correlation only. It does not, and cannot, state
                  whether the underlying compute was correct.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-ground-border/50 py-1.5 last:border-0">
      <dt className="shrink-0 text-ink-faint">{label}</dt>
      <dd className={`truncate text-right text-ink ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  )
}

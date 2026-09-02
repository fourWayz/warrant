import { ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CopyableAddress } from '@/components/copyable-address'
import { docUrl } from '@/lib/repo'
import { MAINNET, TESTNET, explorerAddressUrl, explorerTxUrl } from '@/lib/networks'

const DOCS = [
  { path: 'docs/threat-model.md', label: 'Threat model' },
  { path: 'docs/bypass-analysis.md', label: 'Bypass analysis' },
  { path: 'docs/m3-tracks.md', label: 'M3 — live testnet proof' },
  { path: 'docs/compute-compatibility-finding.md', label: 'Compute compatibility finding' },
  { path: 'docs/m4-reconciliation.md', label: 'M4 — reconciliation design' },
  { path: 'docs/m5-verifier.md', label: 'M5 — verifier & invariants' },
  { path: 'docs/m6-mainnet-deployment.md', label: 'M6 — mainnet deployment record' },
]

function EvidenceRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-ground-border/60 py-2 text-sm last:border-0">
      <span className="text-ink-muted">{label}</span>
      <span className="font-mono text-ink">{value}</span>
    </div>
  )
}

export function EvidencePanel() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Mainnet</CardTitle>
        </CardHeader>
        <CardContent>
          <EvidenceRow
            label="WarrantRegistry"
            value={<CopyableAddress address={MAINNET.contracts.registry} explorerUrl={explorerAddressUrl(MAINNET, MAINNET.contracts.registry)} />}
          />
          <EvidenceRow
            label="WarrantModule"
            value={<CopyableAddress address={MAINNET.contracts.module} explorerUrl={explorerAddressUrl(MAINNET, MAINNET.contracts.module)} />}
          />
          <EvidenceRow
            label="Safe"
            value={<CopyableAddress address={MAINNET.contracts.safe} explorerUrl={explorerAddressUrl(MAINNET, MAINNET.contracts.safe)} />}
          />
          <p className="mt-3 text-xs leading-relaxed text-ink-faint">
            Deployed, independently verified via <code className="font-mono">eth_getCode</code> and live dependency
            reads. No real <code className="font-mono">transferFund</code> executed on mainnet — see Boundaries below.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Galileo (testnet)</CardTitle>
        </CardHeader>
        <CardContent>
          <EvidenceRow
            label="Real funding tx"
            value={
              <a
                href={explorerTxUrl(TESTNET, TESTNET.referenceFundingTx!)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-accent hover:text-accent-bright"
              >
                Track A <ExternalLink size={11} />
              </a>
            }
          />
          <EvidenceRow label="Result" value="AUTHORIZED_ONLY" />
          <EvidenceRow label="Amount" value="0.01 A0GI" />
          <p className="mt-3 text-xs leading-relaxed text-ink-faint">
            A Warrant-authorized transfer actually funded a real{' '}
            <code className="font-mono">InferenceServing</code> sub-account. Disallowed-provider, over-cap, and
            post-revocation attempts were each rejected before broadcast.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Testing</CardTitle>
        </CardHeader>
        <CardContent>
          <EvidenceRow label="Solidity tests" value="49 / 49 passing" />
          <EvidenceRow label="Invariant campaigns" value="3, zero violations" />
          <EvidenceRow label="Randomized calls" value="60,000" />
          <EvidenceRow label="SDK tests" value="21 / 21 passing" />
          <p className="mt-3 text-xs leading-relaxed text-ink-faint">
            Reproducible from a clean checkout — <code className="font-mono">forge test</code> and{' '}
            <code className="font-mono">node --test</code>, no network or funded wallet required.
          </p>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Full documentation trail</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {DOCS.map((d) => (
              <a
                key={d.path}
                href={docUrl(d.path)}
                target="_blank"
                rel="noreferrer"
                className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-ground-border-strong bg-ground-raised px-3 py-1.5 text-xs text-ink-muted transition-colors hover:border-accent/50 hover:text-ink"
              >
                {d.label} <ExternalLink size={11} />
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

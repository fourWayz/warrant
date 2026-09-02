import { IntegrationPanel } from '@/components/integration-panel'
import { BoundariesPanel } from '@/components/boundaries-panel'
import { EvidencePanel } from '@/components/evidence-panel'
import { REPO_URL } from '@/lib/repo'

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-10 px-6 py-16">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">About Warrant</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">
          Warrant is an on-chain spending authorization layer for AI agents using 0G Compute. An owner defines which
          providers an agent may fund, how much, and for how long. That policy is enforced atomically, on-chain, at{' '}
          <code className="rounded bg-ground-raised px-1 py-0.5 font-mono text-xs">LedgerManager.transferFund</code>{' '}
          — the single call that moves an agent&apos;s balance toward a provider — before funds ever reach the
          provider&apos;s sub-account. Native settlement (
          <code className="rounded bg-ground-raised px-1 py-0.5 font-mono text-xs">settleFeesWithTEE</code>) runs
          exactly as 0G built it, unmodified, provider-triggered.
        </p>
        <a href={REPO_URL} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-accent hover:text-accent-bright">
          View the full source and documentation on GitHub →
        </a>
      </div>

      <IntegrationPanel />
      <EvidencePanel />
      <BoundariesPanel />
    </div>
  )
}

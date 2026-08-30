'use client'

import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CopyableAddress } from '@/components/copyable-address'
import { BudgetMeter } from '@/components/budget-meter'
import { PolicySimulator } from '@/components/policy-simulator'
import { ActivityTimeline } from '@/components/activity-timeline'
import { useIsProviderAllowed, useIsStale, useWarrant } from '@/lib/hooks'
import { formatTimestamp, relativeToNow } from '@/lib/format'
import { explorerAddressUrl, NETWORKS, type NetworkKey } from '@/lib/networks'

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-ink-faint">{label}</div>
      <div className="mt-0.5 text-sm text-ink">{value}</div>
    </div>
  )
}

// `networkKey` is validated by the page component before this ever renders
// (an unknown network segment resolves to notFound() there), so this always
// receives a real NetworkConfig — no defensive fallback needed here.
export function WarrantDetail({ networkKey, id }: { networkKey: NetworkKey; id: string }) {
  const network = NETWORKS[networkKey]
  let warrantId: bigint
  try {
    warrantId = BigInt(id)
  } catch {
    warrantId = 0n
  }

  const isReferenceWarrant = warrantId === network.demoWarrant.id

  const { data: warrant, isLoading, isError } = useWarrant(network, warrantId)
  const { data: stale } = useIsStale(network, warrantId)
  // Only meaningful for the network's known reference warrant — this checks
  // one specific provider address against this warrant's allowlist, which
  // is only known ahead of time for the canonical demo warrant. For any
  // other warrant (e.g. one created via /create with a different provider),
  // this would check the wrong address entirely, so it's gated below.
  const { data: providerAllowed } = useIsProviderAllowed(network, warrantId, network.demoWarrant.allowedProvider)

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-24 text-sm text-ink-faint">
        <Loader2 size={16} className="animate-spin" /> reading warrant #{warrantId.toString()} from {network.label}…
      </div>
    )
  }
  if (isError || !warrant) {
    return <div className="py-24 text-sm text-block">Warrant #{warrantId.toString()} could not be read from {network.label}.</div>
  }

  const expired = Number(warrant.expiry) * 1000 < Date.now()

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Warrant #{warrant.id.toString()} <span className="text-ink-faint">· {network.label}</span>
          </h1>
          <Badge variant={warrant.active ? 'allow' : 'block'}>{warrant.active ? 'active' : 'revoked'}</Badge>
          <Badge variant={stale ? 'block' : 'allow'}>{stale ? 'stale' : 'ownership fresh'}</Badge>
          <Badge variant={expired ? 'block' : 'neutral'}>{expired ? 'expired' : 'within window'}</Badge>
        </div>
        <BudgetMeter spent={warrant.spentAmount} cap={warrant.maxTotalSpend} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Policy</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Fact label="Owner at creation" value={<CopyableAddress address={warrant.ownerAtCreation} explorerUrl={explorerAddressUrl(network, warrant.ownerAtCreation)} />} />
          <Fact label="Bound module" value={<CopyableAddress address={warrant.boundModule} explorerUrl={explorerAddressUrl(network, warrant.boundModule)} />} />
          <Fact label="Agentic ID contract" value={<CopyableAddress address={warrant.agenticIdContract} explorerUrl={explorerAddressUrl(network, warrant.agenticIdContract)} />} />
          <Fact label="Token ID" value={warrant.tokenId.toString()} />
          {isReferenceWarrant && (
            <Fact label="Reference allowlisted provider" value={
              <span className="inline-flex items-center gap-2">
                <CopyableAddress address={network.demoWarrant.allowedProvider} />
                <Badge variant={providerAllowed ? 'allow' : 'block'}>{providerAllowed ? 'allowed' : 'not allowed'}</Badge>
              </span>
            } />
          )}
          <Fact label="Version" value={warrant.version.toString()} />
          <Fact label="Start" value={formatTimestamp(warrant.startTime)} />
          <Fact label="Expiry" value={`${formatTimestamp(warrant.expiry)} (${relativeToNow(warrant.expiry)})`} />
        </CardContent>
      </Card>

      <PolicySimulator network={network} warrantId={warrantId} />

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityTimeline network={network} warrantId={warrantId} />
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ActivityTimeline } from '@/components/activity-timeline'
import { MAINNET, TESTNET, type NetworkConfig } from '@/lib/networks'

export default function ActivityPage() {
  const [network, setNetwork] = useState<NetworkConfig>(MAINNET)

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Activity</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          The full authorization and funding history for each network&apos;s demonstration warrant, read directly
          from indexed contract events — not a database, not a cache.
        </p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Warrant #{network.demoWarrant.id.toString()}</CardTitle>
          <div className="flex gap-1 rounded-md border border-ground-border-strong bg-ground-raised p-0.5">
            {[MAINNET, TESTNET].map((n) => (
              <button
                key={n.key}
                onClick={() => setNetwork(n)}
                className={`focus-ring rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  network.key === n.key ? 'bg-accent text-black' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {n.key === 'mainnet' ? 'Mainnet' : 'Galileo'}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <ActivityTimeline network={network} warrantId={network.demoWarrant.id} />
        </CardContent>
      </Card>
    </div>
  )
}

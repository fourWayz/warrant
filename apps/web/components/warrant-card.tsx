'use client'

import Link from 'next/link'
import { ArrowUpRight, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BudgetMeter } from '@/components/budget-meter'
import { useWarrant, useIsStale } from '@/lib/hooks'
import { truncateAddress } from '@/lib/format'
import type { NetworkConfig } from '@/lib/networks'

export function WarrantCard({ network }: { network: NetworkConfig }) {
  const { data: warrant, isLoading } = useWarrant(network, network.demoWarrant.id)
  const { data: stale } = useIsStale(network, network.demoWarrant.id)

  return (
    <Link href={`/warrants/${network.key}/${network.demoWarrant.id}`}>
      <Card className="group h-full transition-colors hover:border-accent/50">
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>
              Warrant #{network.demoWarrant.id.toString()} · {network.label}
            </CardTitle>
            <p className="mt-0.5 text-xs text-ink-faint">module {truncateAddress(network.contracts.module)}</p>
          </div>
          <ArrowUpRight size={16} className="text-ink-faint transition-colors group-hover:text-accent" />
        </CardHeader>
        <CardContent>
          {isLoading || !warrant ? (
            <div className="flex items-center gap-2 text-xs text-ink-faint">
              <Loader2 size={13} className="animate-spin" /> reading live state…
            </div>
          ) : (
            <>
              <BudgetMeter spent={warrant.spentAmount} cap={warrant.maxTotalSpend} />
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge variant={warrant.active ? 'allow' : 'block'}>{warrant.active ? 'active' : 'revoked'}</Badge>
                <Badge variant={stale ? 'block' : 'allow'}>{stale ? 'stale ownership' : 'ownership fresh'}</Badge>
                {network.fundingProven && <Badge variant="accent">real funding proven</Badge>}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

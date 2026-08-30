'use client'

import { WarrantCard } from '@/components/warrant-card'
import { MAINNET, TESTNET } from '@/lib/networks'

export default function WarrantsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Warrants</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">
          Every field below is read live from the deployed contract — provider allowlist, remaining budget, expiry,
          revocation, and ownership freshness are never hardcoded copy.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <WarrantCard network={MAINNET} />
        <WarrantCard network={TESTNET} />
      </div>
    </div>
  )
}

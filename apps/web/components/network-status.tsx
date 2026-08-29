'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CircleCheck, CircleDashed, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CopyableAddress } from '@/components/copyable-address'
import { useDeployedBytecode, useModuleWiring } from '@/lib/hooks'
import { MAINNET, TESTNET, explorerAddressUrl, type NetworkConfig } from '@/lib/networks'

function BytecodeRow({ network, label, address }: { network: NetworkConfig; label: string; address: `0x${string}` }) {
  const { data, isLoading, isError } = useDeployedBytecode(network, address)
  const deployed = Boolean(data && data !== '0x')

  return (
    <div className="flex items-center justify-between gap-3 border-b border-ground-border/60 py-2.5 last:border-0">
      <div className="min-w-0">
        <div className="text-xs text-ink-muted">{label}</div>
        <CopyableAddress address={address} explorerUrl={explorerAddressUrl(network, address)} />
      </div>
      {isLoading ? (
        <Loader2 size={14} className="animate-spin text-ink-faint" />
      ) : isError ? (
        <Badge variant="neutral">RPC unavailable</Badge>
      ) : deployed ? (
        <Badge variant="allow">
          <CircleCheck size={11} /> live
        </Badge>
      ) : (
        <Badge variant="block">
          <CircleDashed size={11} /> no code
        </Badge>
      )}
    </div>
  )
}

function ModuleWiringRow({ network }: { network: NetworkConfig }) {
  const { data, isLoading } = useModuleWiring(network)
  if (isLoading) {
    return <div className="py-2.5 text-xs text-ink-faint">Reading WarrantModule wiring…</div>
  }
  const [safe, ledgerManager, registry] = data ?? []
  const ledgerMatches = (ledgerManager?.result as string | undefined)?.toLowerCase() === network.contracts.ledgerManager.toLowerCase()

  return (
    <div className="mt-3 rounded-md border border-ground-border bg-ground-raised/40 p-3 text-xs">
      <div className="mb-1.5 font-medium text-ink-muted">Live dependency check — WarrantModule.ledgerManager()</div>
      <div className="flex items-center gap-2 font-mono">
        <span className="text-ink-faint">reads:</span>
        <span className="text-ink">{(ledgerManager?.result as string | undefined) ?? '—'}</span>
        {ledgerMatches ? (
          <Badge variant="allow">matches real {network.label} LedgerManager</Badge>
        ) : (
          <Badge variant="block">mismatch</Badge>
        )}
      </div>
      <div className="mt-1 font-mono text-ink-faint">safe() → {(safe?.result as string | undefined) ?? '—'}</div>
      <div className="font-mono text-ink-faint">registry() → {(registry?.result as string | undefined) ?? '—'}</div>
    </div>
  )
}

export function NetworkStatus() {
  const [active, setActive] = useState<NetworkConfig>(MAINNET)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Network &amp; Protocol Status</CardTitle>
          <p className="mt-0.5 text-xs text-ink-faint">Read live from each chain — nothing on this card is cached copy.</p>
        </div>
        <div className="flex gap-1 rounded-md border border-ground-border-strong bg-ground-raised p-0.5">
          {[MAINNET, TESTNET].map((n) => (
            <button
              key={n.key}
              onClick={() => setActive(n)}
              className={`focus-ring rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                active.key === n.key ? 'bg-accent text-black' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {n.key === 'mainnet' ? 'Mainnet' : 'Galileo'}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          <motion.div
            key={active.key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-3 flex items-center gap-2 text-xs text-ink-muted">
              <span>Chain ID</span>
              <span className="font-mono tabular-nums text-ink">{active.chain.id}</span>
            </div>
            <BytecodeRow network={active} label="WarrantRegistry" address={active.contracts.registry} />
            <BytecodeRow network={active} label="WarrantModule" address={active.contracts.module} />
            <BytecodeRow network={active} label="Safe (agent wallet)" address={active.contracts.safe} />
            <ModuleWiringRow network={active} />
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}

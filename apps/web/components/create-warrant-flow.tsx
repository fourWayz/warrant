'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, usePublicClient, useWriteContract } from 'wagmi'
import { parseEther } from 'viem'
import { ArrowRight, CheckCircle2, Loader2, ShieldCheck, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CopyableAddress } from '@/components/copyable-address'
import { mockAgenticIdAbi, warrantRegistryAbi } from '@/lib/abis'
import { TESTNET, explorerTxUrl } from '@/lib/networks'
import { formatTimestamp } from '@/lib/format'

type Step = 'configure' | 'review' | 'minting' | 'creating' | 'done' | 'failed'

const EXPIRY_OPTIONS = [
  { label: '1 day', seconds: 86400 },
  { label: '7 days', seconds: 7 * 86400 },
  { label: '30 days', seconds: 30 * 86400 },
]

function randomTokenId(): bigint {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  let hex = '0x'
  for (const b of bytes) hex += b.toString(16).padStart(2, '0')
  return BigInt(hex)
}

export function CreateWarrantFlow() {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient({ chainId: TESTNET.chain.id })
  const { writeContractAsync } = useWriteContract()

  const [step, setStep] = useState<Step>('configure')
  const [provider, setProvider] = useState<string>(TESTNET.demoWarrant.allowedProvider)
  const [cap, setCap] = useState('0.05')
  const [expirySeconds, setExpirySeconds] = useState(EXPIRY_OPTIONS[1].seconds)
  const [error, setError] = useState<string | null>(null)
  const [mintTx, setMintTx] = useState<`0x${string}` | null>(null)
  const [createTx, setCreateTx] = useState<`0x${string}` | null>(null)
  const [newWarrantId, setNewWarrantId] = useState<bigint | null>(null)

  const expiry = Math.floor(Date.now() / 1000) + expirySeconds

  async function submit() {
    if (!address || !publicClient) return
    setError(null)
    const tokenId = randomTokenId()

    try {
      setStep('minting')
      const mintHash = await writeContractAsync({
        chainId: TESTNET.chain.id,
        address: TESTNET.contracts.mockAgenticId,
        abi: mockAgenticIdAbi,
        functionName: 'mint',
        args: [address, tokenId],
      })
      setMintTx(mintHash)
      await publicClient.waitForTransactionReceipt({ hash: mintHash })

      setStep('creating')
      const startTime = Math.floor(Date.now() / 1000)
      const createHash = await writeContractAsync({
        chainId: TESTNET.chain.id,
        address: TESTNET.contracts.registry,
        abi: warrantRegistryAbi,
        functionName: 'createWarrant',
        args: [
          {
            agenticIdContract: TESTNET.contracts.mockAgenticId,
            tokenId,
            module: TESTNET.contracts.module,
            providers: [provider as `0x${string}`],
            restrictServices: false,
            allowedServices: [],
            maxTotalSpend: parseEther(cap || '0'),
            startTime: BigInt(startTime),
            expiry: BigInt(expiry),
          },
        ],
      })
      setCreateTx(createHash)
      const receipt = await publicClient.waitForTransactionReceipt({ hash: createHash })

      const createdLog = receipt.logs.find(
        (l) => l.address.toLowerCase() === TESTNET.contracts.registry.toLowerCase() && l.topics.length === 4
      )
      if (createdLog?.topics[1]) {
        setNewWarrantId(BigInt(createdLog.topics[1]))
      }
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed.')
      setStep('failed')
    }
  }

  if (!isConnected) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <ShieldCheck size={28} className="text-accent" />
          <p className="max-w-sm text-sm text-ink-muted">
            Connect a wallet with 0G Galileo testnet A0GI to create a real warrant. This submits two real
            transactions to Galileo — nothing here is simulated.
          </p>
          <ConnectButton.Custom>
            {({ openConnectModal }) => <Button onClick={openConnectModal}>Connect Agent Wallet</Button>}
          </ConnectButton.Custom>
        </CardContent>
      </Card>
    )
  }

  return (
    <AnimatePresence mode="wait">
      {step === 'configure' && (
        <motion.div key="configure" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle>Configure policy</CardTitle>
              <p className="text-xs text-ink-faint">0G Galileo testnet · registry {TESTNET.contracts.registry.slice(0, 10)}…</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs text-ink-muted">Allowed provider</label>
                <Input value={provider} onChange={(e) => setProvider(e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-ink-muted">Maximum spend (A0GI)</label>
                <Input value={cap} onChange={(e) => setCap(e.target.value)} className="w-40" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-ink-muted">Expires</label>
                <div className="flex gap-2">
                  {EXPIRY_OPTIONS.map((opt) => (
                    <button
                      key={opt.seconds}
                      onClick={() => setExpirySeconds(opt.seconds)}
                      className={`focus-ring rounded-md border px-3 py-1.5 text-xs transition-colors ${
                        expirySeconds === opt.seconds
                          ? 'border-accent bg-accent-wash text-accent-bright'
                          : 'border-ground-border-strong text-ink-muted hover:text-ink'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={() => setStep('review')} className="mt-2">
                Review authorization <ArrowRight size={15} />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {step === 'review' && (
        <motion.div key="review" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          <Card className="border-accent/30">
            <CardHeader>
              <CardTitle>Authorization Request</CardTitle>
              <p className="text-xs text-ink-faint">Review exactly what authority this grants before signing.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <ReviewRow label="Provider" value={<CopyableAddress address={provider} />} />
              <ReviewRow label="Maximum spend" value={`${cap} A0GI`} />
              <ReviewRow label="Expires" value={formatTimestamp(expiry)} />
              <ReviewRow label="Bound module" value={<CopyableAddress address={TESTNET.contracts.module} />} />
              <ReviewRow label="Status" value={<Badge variant="accent">READY TO AUTHORIZE</Badge>} />
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" onClick={() => setStep('configure')}>
                  Back
                </Button>
                <Button onClick={submit}>Authorize &amp; Submit</Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {(step === 'minting' || step === 'creating') && (
        <motion.div key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <Loader2 size={26} className="animate-spin text-accent" />
              <div className="text-sm text-ink">
                {step === 'minting' ? 'Minting demo Agentic ID…' : 'Creating warrant…'}
              </div>
              <div className="flex flex-col gap-1 text-xs text-ink-faint">
                <StepStatus label="Awaiting signature / submitted" done />
                <StepStatus label="Confirming on Galileo" active />
              </div>
              {mintTx && (
                <a href={explorerTxUrl(TESTNET, mintTx)} target="_blank" rel="noreferrer" className="text-xs text-accent">
                  mint tx: {mintTx.slice(0, 12)}…
                </a>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {step === 'done' && (
        <motion.div key="done" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="border-allow/30 bg-allow-wash/30">
            <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
              <CheckCircle2 size={30} className="text-allow" />
              <div className="text-sm font-medium text-ink">Warrant created on 0G Galileo</div>
              {createTx && (
                <a href={explorerTxUrl(TESTNET, createTx)} target="_blank" rel="noreferrer" className="text-xs text-accent hover:text-accent-bright">
                  view creation transaction
                </a>
              )}
              {newWarrantId !== null && (
                <Link href={`/warrants/testnet/${newWarrantId.toString()}`}>
                  <Button variant="secondary">Inspect warrant #{newWarrantId.toString()}</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {step === 'failed' && (
        <motion.div key="failed" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="border-block/30 bg-block-wash/30">
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <XCircle size={26} className="text-block" />
              <div className="text-sm font-medium text-block">Transaction failed</div>
              <p className="max-w-sm text-xs text-ink-muted">{error}</p>
              <Button variant="secondary" onClick={() => setStep('review')}>
                Try again
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-ground-border/50 py-1.5 text-sm last:border-0">
      <span className="text-ink-muted">{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  )
}

function StepStatus({ label, done, active }: { label: string; done?: boolean; active?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {done ? <CheckCircle2 size={12} className="text-allow" /> : active ? <Loader2 size={12} className="animate-spin" /> : null}
      {label}
    </div>
  )
}

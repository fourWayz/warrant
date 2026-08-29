'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-ground-border">
      <div className="grain-fade pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-4xl px-6 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-ground-border-strong bg-ground-panel/70 px-3 py-1 text-xs text-ink-muted"
        >
          <ShieldCheck size={13} className="text-accent" />
          Live on 0G Mainnet — chain 16661
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05 }}
          className="text-balance text-4xl font-semibold tracking-tight text-ink sm:text-5xl"
        >
          The spending boundary
          <br />
          for AI agents on 0G.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.12 }}
          className="mx-auto mt-5 max-w-xl text-balance text-[15px] leading-relaxed text-ink-muted"
        >
          An owner defines where an agent may spend, how much, and when that authority expires — enforced on-chain,
          atomically, before funds reach a 0G Compute provider.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.2 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <ConnectButton.Custom>
            {({ openConnectModal, account, mounted }) => (
              <Button size="lg" onClick={openConnectModal}>
                {mounted && account ? 'Wallet Connected' : 'Connect Agent Wallet'}
                <ArrowRight size={16} />
              </Button>
            )}
          </ConnectButton.Custom>
          <Link href="/verify">
            <Button size="lg" variant="secondary">
              Verify a Transaction
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

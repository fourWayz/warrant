import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Hero } from '@/components/hero'
import { ArchitectureFlow } from '@/components/architecture-flow'
import { WhyWarrant } from '@/components/why-warrant'
import { NetworkStatus } from '@/components/network-status'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div>
      <Hero />

      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">Where the boundary actually sits</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Every funding request passes through this exact chain of contracts. There is no shortcut, no arbitrary
            call, no path that skips the check.
          </p>
        </div>
        <ArchitectureFlow />
      </section>

      <section className="border-t border-ground-border bg-ground-raised/20 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-8 text-center text-2xl font-semibold tracking-tight text-ink">Why it matters</h2>
          <WhyWarrant />
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-20">
        <NetworkStatus />
      </section>

      <section className="border-t border-ground-border py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="text-balance text-xl font-medium leading-relaxed text-ink sm:text-2xl">
            Warrant does not give the agent unlimited spending power.
            <br />
            It gives the agent exactly the spending authority its owner defined.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/verify">
              <Button size="lg">
                Explore verified example <ArrowRight size={16} />
              </Button>
            </Link>
            <Link href="/about">
              <Button size="lg" variant="secondary">
                Read the boundaries
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

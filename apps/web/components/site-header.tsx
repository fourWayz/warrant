'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/warrants', label: 'Warrants' },
  { href: '/verify', label: 'Verify' },
  { href: '/activity', label: 'Activity' },
  { href: '/create', label: 'Create' },
  { href: '/about', label: 'About' },
]

export function SiteHeader() {
  const pathname = usePathname()
  return (
    <header className="sticky top-0 z-40 border-b border-ground-border bg-ground/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="focus-ring flex items-center gap-2.5">
          <ShieldCheck size={20} className="text-accent" strokeWidth={1.75} />
          <span className="text-[15px] font-semibold tracking-tight text-ink">Warrant</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active = item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'focus-ring rounded-md px-3 py-2 text-sm transition-colors',
                  active ? 'text-ink' : 'text-ink-muted hover:text-ink'
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-3">
          <ConnectButton
            showBalance={false}
            chainStatus="icon"
            accountStatus={{ smallScreen: 'avatar', largeScreen: 'address' }}
            label="Connect Agent Wallet"
          />
        </div>
      </div>
      <nav className="flex items-center gap-1 overflow-x-auto border-t border-ground-border px-4 py-1.5 md:hidden">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="focus-ring whitespace-nowrap rounded-md px-2.5 py-1 text-xs text-ink-muted hover:text-ink"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}

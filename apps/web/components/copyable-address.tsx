'use client'

import { useState } from 'react'
import { Check, Copy, ExternalLink } from 'lucide-react'
import { truncateAddress } from '@/lib/format'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function CopyableAddress({
  address,
  explorerUrl,
  chars = 4,
  className,
}: {
  address: string
  explorerUrl?: string
  chars?: number
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API can be unavailable (insecure context, permissions) —
      // fail quietly rather than throwing in the UI.
    }
  }

  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-sm ${className ?? ''}`}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="tabular-nums">{truncateAddress(address, chars)}</span>
        </TooltipTrigger>
        <TooltipContent>{address}</TooltipContent>
      </Tooltip>
      <button
        onClick={copy}
        aria-label="Copy address"
        className="focus-ring text-ink-faint transition-colors hover:text-accent"
      >
        {copied ? <Check size={13} className="text-allow" /> : <Copy size={13} />}
      </button>
      {explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="View on explorer"
          className="focus-ring text-ink-faint transition-colors hover:text-accent"
        >
          <ExternalLink size={13} />
        </a>
      )}
    </span>
  )
}

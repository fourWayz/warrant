import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider',
  {
    variants: {
      variant: {
        neutral: 'border-ground-border-strong bg-ground-raised text-ink-muted',
        accent: 'border-accent/30 bg-accent-wash text-accent-bright',
        allow: 'border-allow/30 bg-allow-wash text-allow',
        block: 'border-block/30 bg-block-wash text-block',
      },
    },
    defaultVariants: { variant: 'neutral' },
  }
)

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

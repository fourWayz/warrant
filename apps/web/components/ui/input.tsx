import * as React from 'react'
import { cn } from '@/lib/utils'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'focus-ring flex h-10 w-full rounded-md border border-ground-border-strong bg-ground-raised px-3 py-2 font-mono text-sm text-ink placeholder:text-ink-faint',
        className
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'

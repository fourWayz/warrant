'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'
import { wagmiConfig } from '@/lib/wagmi'
import { TooltipProvider } from '@/components/ui/tooltip'

const rainbowTheme = darkTheme({
  accentColor: '#c9a24a',
  accentColorForeground: '#08090b',
  borderRadius: 'medium',
  fontStack: 'system',
})

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={rainbowTheme} appInfo={{ appName: 'Warrant' }}>
          <TooltipProvider delayDuration={150}>{children}</TooltipProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

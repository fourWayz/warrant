import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { zgGalileo, zgMainnet } from './chains'

export const wagmiConfig = getDefaultConfig({
  appName: 'Warrant',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'warrant-demo-placeholder',
  chains: [zgMainnet, zgGalileo],
  ssr: true,
})

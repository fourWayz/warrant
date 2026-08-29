import { defineChain } from 'viem'

// 0G mainnet and testnet (Galileo) are not in viem's built-in chain list —
// both defined here from the same values recorded in deployments/*.json,
// independently confirmed via eth_chainId during M0/M6 (see
// docs/m6-mainnet-deployment.md).

export const zgMainnet = defineChain({
  id: 16661,
  name: '0G Mainnet',
  nativeCurrency: { name: 'A0GI', symbol: 'A0GI', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://evmrpc.0g.ai'] },
  },
  blockExplorers: {
    default: { name: '0G ChainScan', url: 'https://chainscan.0g.ai' },
  },
})

export const zgGalileo = defineChain({
  id: 16602,
  name: '0G Galileo Testnet',
  nativeCurrency: { name: 'A0GI', symbol: 'A0GI', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://evmrpc-testnet.0g.ai'] },
  },
  blockExplorers: {
    default: { name: '0G ChainScan (Galileo)', url: 'https://chainscan-galileo.0g.ai' },
  },
  testnet: true,
})

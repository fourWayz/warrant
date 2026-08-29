import type { Chain } from 'viem'
import mainnetDeployment from '../../../deployments/mainnet.json'
import testnetDeployment from '../../../deployments/testnet.json'
import { zgGalileo, zgMainnet } from './chains'

export type NetworkKey = 'mainnet' | 'testnet'

export interface NetworkConfig {
  key: NetworkKey
  label: string
  chain: Chain
  explorerUrl: string
  rpcUrl: string
  contracts: {
    registry: `0x${string}`
    module: `0x${string}`
    safe: `0x${string}`
    mockAgenticId: `0x${string}`
    ledgerManager: `0x${string}`
    inferenceServing: `0x${string}` | null
  }
  demoWarrant: {
    id: bigint
    owner: `0x${string}`
    executor: `0x${string}`
    allowedProvider: `0x${string}`
  }
  fundingProven: boolean
  /** The one real, on-chain executed transfer this network has to show, if any. */
  referenceFundingTx: `0x${string}` | null
}

// Mainnet: every address below comes straight from deployments/mainnet.json,
// written after independent eth_getCode / eth_call verification during M6
// (see docs/m6-mainnet-deployment.md). Nothing here is retyped by hand.
export const MAINNET: NetworkConfig = {
  key: 'mainnet',
  label: '0G Mainnet',
  chain: zgMainnet,
  explorerUrl: 'https://chainscan.0g.ai',
  rpcUrl: mainnetDeployment.rpcUrl,
  contracts: {
    registry: mainnetDeployment.warrant.registry as `0x${string}`,
    module: mainnetDeployment.warrant.module as `0x${string}`,
    safe: mainnetDeployment.safe.proxy as `0x${string}`,
    mockAgenticId: mainnetDeployment.warrant.mockAgenticId as `0x${string}`,
    ledgerManager: mainnetDeployment.og.ledgerManager as `0x${string}`,
    inferenceServing: mainnetDeployment.og.inferenceServing as `0x${string}`,
  },
  demoWarrant: {
    id: BigInt(mainnetDeployment.warrant.warrantId),
    owner: mainnetDeployment.safe.owner as `0x${string}`,
    executor: mainnetDeployment.warrant.executor as `0x${string}`,
    allowedProvider: mainnetDeployment.warrant.allowedProvider as `0x${string}`,
  },
  // No real transferFund has been executed on mainnet — 0G's own
  // MIN_ACCOUNT_BALANCE (3 A0GI) / MIN_TRANSFER_AMOUNT (1 A0GI) exceed the
  // funded deployer's balance. Disclosed, not hidden — see
  // docs/m6-mainnet-deployment.md §7.
  fundingProven: false,
  referenceFundingTx: null,
}

// Testnet (Galileo): registry/ledgerManager/inferenceServing/safe-singleton
// come from deployments/testnet.json. The specific Safe/WarrantModule/
// MockAgenticId instance below is the real, live "Track A" run recorded in
// docs/m3-tracks.md — the one warrant that has an actual executed
// transferFund behind it. Hardcoded here (not in testnet.json, which only
// tracks shared infrastructure, not per-run instances) with that doc as the
// source of truth.
export const TESTNET: NetworkConfig = {
  key: 'testnet',
  label: '0G Galileo Testnet',
  chain: zgGalileo,
  explorerUrl: 'https://chainscan-galileo.0g.ai',
  rpcUrl: testnetDeployment.rpcUrl,
  contracts: {
    registry: testnetDeployment.warrant.registry as `0x${string}`,
    module: '0xf47E11f9E499994C96b0C2e9ce1b7978db9416d8',
    safe: '0x7F11f64A7d470D2B0a49cAc36837ffa49f8c63e9',
    mockAgenticId: '0x082F6a345A089fe4C27e2fF7bbcdA4ED72BB82cA',
    ledgerManager: testnetDeployment.og.ledgerManager as `0x${string}`,
    inferenceServing: testnetDeployment.og.inferenceServing as `0x${string}`,
  },
  demoWarrant: {
    id: 1n,
    owner: '0x8ce1060e4fC5010D000390Ef87D0821d7c717bB1',
    executor: '0xE18638Fd5D1E70f6F460e5Da47914fF7f6A5f1b1',
    allowedProvider: '0x87a13337F0d4B2b08cce9189DBE9555690828ed4',
  },
  fundingProven: true,
  referenceFundingTx: '0x635cd6cca736a2df02e8734f5b8fdf6ac54fb795e83356b40207fbd28cea68d2',
}

export const NETWORKS: Record<NetworkKey, NetworkConfig> = {
  mainnet: MAINNET,
  testnet: TESTNET,
}

export function explorerAddressUrl(network: NetworkConfig, address: string) {
  return `${network.explorerUrl}/address/${address}`
}

export function explorerTxUrl(network: NetworkConfig, txHash: string) {
  return `${network.explorerUrl}/tx/${txHash}`
}

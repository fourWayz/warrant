'use client'

import { useReadContract, useReadContracts, useBytecode } from 'wagmi'
import { warrantRegistryAbi, warrantModuleAbi, safeAbi, ledgerManagerAbi } from './abis'
import type { NetworkConfig } from './networks'

export function useWarrant(network: NetworkConfig, warrantId: bigint) {
  return useReadContract({
    chainId: network.chain.id,
    address: network.contracts.registry,
    abi: warrantRegistryAbi,
    functionName: 'getWarrant',
    args: [warrantId],
    query: { retry: 1 },
  })
}

export function useRemainingBudget(network: NetworkConfig, warrantId: bigint) {
  return useReadContract({
    chainId: network.chain.id,
    address: network.contracts.registry,
    abi: warrantRegistryAbi,
    functionName: 'remainingBudget',
    args: [warrantId],
  })
}

export function useIsStale(network: NetworkConfig, warrantId: bigint) {
  return useReadContract({
    chainId: network.chain.id,
    address: network.contracts.registry,
    abi: warrantRegistryAbi,
    functionName: 'isStale',
    args: [warrantId],
  })
}

export function useIsProviderAllowed(network: NetworkConfig, warrantId: bigint, provider: `0x${string}`) {
  return useReadContract({
    chainId: network.chain.id,
    address: network.contracts.registry,
    abi: warrantRegistryAbi,
    functionName: 'isProviderAllowed',
    args: [warrantId, provider],
    query: { enabled: Boolean(provider) },
  })
}

/** The three immutables a WarrantModule was constructed with, read live. */
export function useModuleWiring(network: NetworkConfig) {
  return useReadContracts({
    contracts: [
      { chainId: network.chain.id, address: network.contracts.module, abi: warrantModuleAbi, functionName: 'safe' },
      { chainId: network.chain.id, address: network.contracts.module, abi: warrantModuleAbi, functionName: 'ledgerManager' },
      { chainId: network.chain.id, address: network.contracts.module, abi: warrantModuleAbi, functionName: 'registry' },
    ],
  })
}

export function useSafeInfo(network: NetworkConfig) {
  return useReadContracts({
    contracts: [
      { chainId: network.chain.id, address: network.contracts.safe, abi: safeAbi, functionName: 'getOwners' },
      { chainId: network.chain.id, address: network.contracts.safe, abi: safeAbi, functionName: 'getThreshold' },
      {
        chainId: network.chain.id,
        address: network.contracts.safe,
        abi: safeAbi,
        functionName: 'isModuleEnabled',
        args: [network.contracts.module],
      },
    ],
  })
}

export function useLedgerMinimums(network: NetworkConfig) {
  return useReadContracts({
    contracts: [
      { chainId: network.chain.id, address: network.contracts.ledgerManager, abi: ledgerManagerAbi, functionName: 'MIN_ACCOUNT_BALANCE' },
      { chainId: network.chain.id, address: network.contracts.ledgerManager, abi: ledgerManagerAbi, functionName: 'MIN_TRANSFER_AMOUNT' },
    ],
  })
}

export function useExecutorWarrantId(network: NetworkConfig, executor: `0x${string}`) {
  return useReadContract({
    chainId: network.chain.id,
    address: network.contracts.module,
    abi: warrantModuleAbi,
    functionName: 'executorWarrant',
    args: [executor],
  })
}

/** Live proof-of-deployment: non-empty bytecode at an address, right now. */
export function useDeployedBytecode(network: NetworkConfig, address: `0x${string}`) {
  return useBytecode({ chainId: network.chain.id, address })
}

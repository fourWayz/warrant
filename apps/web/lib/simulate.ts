import { BaseError, ContractFunctionRevertedError, parseEther } from 'viem'
import { warrantModuleAbi, warrantRegistryAbi } from './abis'
import { publicClientFor } from './viemClients'
import type { NetworkConfig } from './networks'

export interface PolicyCheckResult {
  allowed: boolean
  errorName?: string
  errorArgs?: readonly unknown[]
  message: string
}

const COMBINED_ABI = [...warrantModuleAbi, ...warrantRegistryAbi] as const

const ERROR_MESSAGES: Record<string, (args: readonly unknown[]) => string> = {
  NotAuthorizedExecutor: () => 'Caller has no warrant bound to it on this WarrantModule.',
  ProviderNotAllowed: (args) => `Provider ${args[1]} is not on this warrant's allowlist.`,
  WarrantNotActive: () => 'This warrant has been revoked.',
  WarrantExpired: () => 'This warrant has expired.',
  WarrantNotYetStarted: () => 'This warrant has not started yet.',
  WarrantStale: (args) => `Agentic ID ownership changed — expected ${args[1]}, currently ${args[2]}.`,
  BudgetExceeded: (args) => `Requested amount exceeds the remaining budget (remaining: ${args[2]}).`,
  ZeroAmount: () => 'Amount must be greater than zero.',
  ZeroAddress: () => 'A required address was zero.',
}

/**
 * Runs the exact same on-chain policy check WarrantModule.executeTransfer
 * would run — via eth_call (simulateContract), impersonating `account`.
 * This spends no gas and moves no funds: it is the deployed contract's own
 * logic evaluating a real request, live, against real state.
 *
 * `account` matters: WarrantModule resolves the warrant to check entirely
 * from `executorWarrant[msg.sender]`, not from any warrantId this app
 * passes in. Callers must pass the address actually bound as an executor
 * for the warrant they mean to test — see PolicySimulator, which only uses
 * the network's known reference executor when viewing that network's
 * canonical demo warrant, and otherwise passes an address with no binding
 * at all (the true, honest state for a warrant created via /create, which
 * never calls setExecutor).
 */
export async function simulatePolicyCheck(
  network: NetworkConfig,
  params: { provider: `0x${string}`; serviceName: string; amountEther: string; account: `0x${string}` }
): Promise<PolicyCheckResult> {
  const client = publicClientFor(network)
  const amount = parseEther(params.amountEther || '0')

  try {
    await client.simulateContract({
      address: network.contracts.module,
      abi: COMBINED_ABI,
      functionName: 'executeTransfer',
      args: [params.provider, params.serviceName, amount],
      account: params.account,
    })
    return { allowed: true, message: 'Every policy condition held. The Safe would execute transferFund.' }
  } catch (err) {
    if (err instanceof BaseError) {
      const revertError = err.walk((e) => e instanceof ContractFunctionRevertedError)
      if (revertError instanceof ContractFunctionRevertedError) {
        const errorName = revertError.data?.errorName ?? revertError.reason ?? 'unknown'
        const errorArgs = revertError.data?.args ?? []
        const message = ERROR_MESSAGES[errorName]?.(errorArgs) ?? revertError.shortMessage ?? 'Reverted.'
        return { allowed: false, errorName, errorArgs, message }
      }
      return { allowed: false, message: err.shortMessage ?? 'Simulation reverted for an undecoded reason.' }
    }
    return { allowed: false, message: err instanceof Error ? err.message : 'Simulation failed.' }
  }
}

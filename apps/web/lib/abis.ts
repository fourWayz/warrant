// Every entry here is transcribed directly from the deployed source
// (contracts/src/*.sol, contracts/src/interfaces/*.sol, and the M0-recorded
// 0G LedgerManager ABI) — nothing here is guessed or reconstructed from
// documentation. Only the functions/events/errors this app actually reads
// or simulates are included; this is a read surface, not a full ABI dump.

export const warrantRegistryAbi = [
  {
    type: 'function',
    name: 'getWarrant',
    stateMutability: 'view',
    inputs: [{ name: 'warrantId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'agenticIdContract', type: 'address' },
          { name: 'tokenId', type: 'uint256' },
          { name: 'ownerAtCreation', type: 'address' },
          { name: 'boundModule', type: 'address' },
          { name: 'maxTotalSpend', type: 'uint256' },
          { name: 'spentAmount', type: 'uint256' },
          { name: 'startTime', type: 'uint64' },
          { name: 'expiry', type: 'uint64' },
          { name: 'active', type: 'bool' },
          { name: 'version', type: 'uint32' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'isProviderAllowed',
    stateMutability: 'view',
    inputs: [
      { name: 'warrantId', type: 'uint256' },
      { name: 'provider', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'remainingBudget',
    stateMutability: 'view',
    inputs: [{ name: 'warrantId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'isStale',
    stateMutability: 'view',
    inputs: [{ name: 'warrantId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'createWarrant',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'agenticIdContract', type: 'address' },
          { name: 'tokenId', type: 'uint256' },
          { name: 'module', type: 'address' },
          { name: 'providers', type: 'address[]' },
          { name: 'restrictServices', type: 'bool' },
          { name: 'allowedServices', type: 'string[]' },
          { name: 'maxTotalSpend', type: 'uint256' },
          { name: 'startTime', type: 'uint64' },
          { name: 'expiry', type: 'uint64' },
        ],
      },
    ],
    outputs: [{ name: 'warrantId', type: 'uint256' }],
  },
  {
    type: 'event',
    name: 'WarrantCreated',
    inputs: [
      { name: 'warrantId', type: 'uint256', indexed: true },
      { name: 'agenticIdContract', type: 'address', indexed: true },
      { name: 'tokenId', type: 'uint256', indexed: true },
      { name: 'owner', type: 'address', indexed: false },
      { name: 'module', type: 'address', indexed: false },
      { name: 'maxTotalSpend', type: 'uint256', indexed: false },
      { name: 'startTime', type: 'uint64', indexed: false },
      { name: 'expiry', type: 'uint64', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'WarrantProviderSet',
    inputs: [
      { name: 'warrantId', type: 'uint256', indexed: true },
      { name: 'provider', type: 'address', indexed: true },
      { name: 'allowed', type: 'bool', indexed: false },
      { name: 'version', type: 'uint32', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'WarrantRevoked',
    inputs: [
      { name: 'warrantId', type: 'uint256', indexed: true },
      { name: 'revokedBy', type: 'address', indexed: true },
      { name: 'version', type: 'uint32', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'SpendRecorded',
    inputs: [
      { name: 'warrantId', type: 'uint256', indexed: true },
      { name: 'provider', type: 'address', indexed: true },
      { name: 'serviceName', type: 'string', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'newSpentAmount', type: 'uint256', indexed: false },
      { name: 'spender', type: 'address', indexed: false },
    ],
  },
  { type: 'error', name: 'NotTokenOwner', inputs: [{ name: 'warrantId', type: 'uint256' }, { name: 'caller', type: 'address' }] },
  { type: 'error', name: 'WarrantNotFound', inputs: [{ name: 'warrantId', type: 'uint256' }] },
  { type: 'error', name: 'WarrantNotActive', inputs: [{ name: 'warrantId', type: 'uint256' }] },
  {
    type: 'error',
    name: 'WarrantExpired',
    inputs: [
      { name: 'warrantId', type: 'uint256' },
      { name: 'expiry', type: 'uint64' },
      { name: 'currentTime', type: 'uint256' },
    ],
  },
  {
    type: 'error',
    name: 'WarrantStale',
    inputs: [
      { name: 'warrantId', type: 'uint256' },
      { name: 'expectedOwner', type: 'address' },
      { name: 'currentOwner', type: 'address' },
    ],
  },
  {
    type: 'error',
    name: 'ProviderNotAllowed',
    inputs: [
      { name: 'warrantId', type: 'uint256' },
      { name: 'provider', type: 'address' },
    ],
  },
  {
    type: 'error',
    name: 'BudgetExceeded',
    inputs: [
      { name: 'warrantId', type: 'uint256' },
      { name: 'requested', type: 'uint256' },
      { name: 'remaining', type: 'uint256' },
    ],
  },
  { type: 'error', name: 'ZeroAddress', inputs: [] },
  { type: 'error', name: 'ZeroAmount', inputs: [] },
  { type: 'error', name: 'InvalidExpiry', inputs: [] },
] as const

export const warrantModuleAbi = [
  { type: 'function', name: 'safe', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', name: 'ledgerManager', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', name: 'registry', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  {
    type: 'function',
    name: 'executorWarrant',
    stateMutability: 'view',
    inputs: [{ name: 'executor', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'executeTransfer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'provider', type: 'address' },
      { name: 'serviceName', type: 'string' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'event',
    name: 'ExecutorSet',
    inputs: [
      { name: 'executor', type: 'address', indexed: true },
      { name: 'warrantId', type: 'uint256', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'TransferExecuted',
    inputs: [
      { name: 'executor', type: 'address', indexed: true },
      { name: 'warrantId', type: 'uint256', indexed: true },
      { name: 'provider', type: 'address', indexed: true },
      { name: 'serviceName', type: 'string', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  { type: 'error', name: 'ZeroAddress', inputs: [] },
  { type: 'error', name: 'NotSafe', inputs: [] },
  { type: 'error', name: 'NotAuthorizedExecutor', inputs: [{ name: 'caller', type: 'address' }] },
  { type: 'error', name: 'ZeroAmount', inputs: [] },
  { type: 'error', name: 'TransferFailed', inputs: [] },
] as const

export const safeAbi = [
  { type: 'function', name: 'getOwners', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address[]' }] },
  { type: 'function', name: 'getThreshold', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  {
    type: 'function',
    name: 'isModuleEnabled',
    stateMutability: 'view',
    inputs: [{ name: 'module', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  { type: 'function', name: 'nonce', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
] as const

export const mockAgenticIdAbi = [
  {
    type: 'function',
    name: 'ownerOf',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'mint',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
    ],
    outputs: [],
  },
  { type: 'function', name: 'name', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
] as const

export const ledgerManagerAbi = [
  { type: 'function', name: 'MIN_ACCOUNT_BALANCE', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'MIN_TRANSFER_AMOUNT', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  {
    type: 'function',
    name: 'getLedger',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'user', type: 'address' },
          { name: 'availableBalance', type: 'uint256' },
          { name: 'totalBalance', type: 'uint256' },
          { name: 'additionalInfo', type: 'string' },
        ],
      },
    ],
  },
] as const

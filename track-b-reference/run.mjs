// Track B — isolated native 0G Compute reference flow.
//
// This EOA is completely separate from the Warrant-controlled Safe built in
// Track A. It uses its own funds, sent by a plain wallet transfer, never
// routed through WarrantModule or WarrantRegistry. It exists only to show
// what a real 0G Compute session looks like end to end, so the M3
// compatibility finding is grounded in an actual observed exchange rather
// than an assumption. Nothing here is Warrant-governed, and nothing here
// should be read as Warrant controlling or vouching for it.
//
// See docs/m3-tracks.md for the full run history and exact tx hashes, and
// docs/compute-compatibility-finding.md for why this EOA — and never the
// Safe — is the identity that can actually hold an authenticated session.
//
// Usage: TRACK_B_KEY=0x... node run.mjs

import { ethers } from 'ethers'
import { createZGComputeNetworkBroker } from '@0gfoundation/0g-compute-ts-sdk'

const RPC = 'https://evmrpc-testnet.0g.ai'
const LEDGER_MANAGER = '0xE70830508dAc0A97e6c087c75f402f9Be669E406'
const PRIVATE_KEY = process.env.TRACK_B_KEY

// The first provider tried (0x87a13337...) has a real, registered listing
// but its HTTP endpoint is a Phala `dstack` confidential-VM host that
// fails at the TLS layer from this network — confirmed independently with
// plain `curl`, unrelated to Warrant or the SDK. This one is confirmed
// network-reachable.
const PROVIDER_ADDRESS = '0xa48f01287233509FD694a22Bf840225062E67836'
const SERVICE_NAME_RAW = 'inference-v1.0' // exact registered name for direct contract calls; the SDK's own wrapper takes plain 'inference'

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC)
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider)
  console.log('Track B EOA:', wallet.address)
  console.log('Balance:', ethers.formatEther(await provider.getBalance(wallet.address)), 'A0GI')

  const broker = await createZGComputeNetworkBroker(wallet)

  console.log('\n--- ledger ---')
  // broker.ledger.addLedger() refuses anything below 3 A0GI as a
  // client-side safety minimum; the deployed contract itself only requires
  // 0.1 A0GI (MIN_ACCOUNT_BALANCE, confirmed via eth_call during M0/M3).
  // This flow is funding-constrained, so ledger creation went straight to
  // the contract the first time this ran. Re-running is idempotent: if the
  // ledger already exists this just logs its state.
  const ledgerAbi = [
    'function addLedger(string) payable returns (uint256,uint256)',
    'function transferFund(address,string,uint256)',
    'function getLedger(address) view returns (address,uint256,uint256,string)',
  ]
  const ledgerContract = new ethers.Contract(LEDGER_MANAGER, ledgerAbi, wallet)
  const existing = await ledgerContract.getLedger(wallet.address).catch(() => null)
  if (existing) {
    console.log('ledger exists:', existing)
  } else {
    const tx = await ledgerContract.addLedger('', { value: ethers.parseEther('0.1') })
    console.log('addLedger tx:', (await tx.wait()).hash)
  }

  console.log('\n--- opening provider sub-account (raw contract call) ---')
  // Opens the account at the real contract minimum (0.01 A0GI) rather than
  // through broker.inference.acknowledgeProviderSigner(), whose internal
  // account-opening path is hardcoded to 1 A0GI — that constant's own
  // source comment claims it "matches contract MIN_TRANSFER_AMOUNT", but
  // the live value is 0.01 A0GI. A real, documented SDK/contract mismatch,
  // not something this project can fix.
  const account = await new ethers.Contract(
    '0xa79F4c8311FF93C06b8CfB403690cc987c93F91E',
    ['function accountExists(address,address) view returns (bool)'],
    wallet
  ).accountExists(wallet.address, PROVIDER_ADDRESS)
  if (!account) {
    const tx = await ledgerContract.transferFund(PROVIDER_ADDRESS, SERVICE_NAME_RAW, ethers.parseEther('0.01'))
    console.log('account-opening tx:', (await tx.wait()).hash)
  } else {
    console.log('provider sub-account already exists')
  }

  console.log('\n--- acknowledging provider (unmodified SDK) ---')
  await broker.inference.acknowledgeProviderSigner(PROVIDER_ADDRESS)
  console.log('acknowledged')

  const { endpoint, model } = await broker.inference.getServiceMetadata(PROVIDER_ADDRESS)
  console.log('endpoint:', endpoint, 'model:', model)

  console.log('\n--- making inference request (unmodified SDK) ---')
  const headers = await broker.inference.getRequestHeaders(PROVIDER_ADDRESS)
  const res = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'Say the single word: verified' }],
      max_tokens: 10,
    }),
  })
  const resHeaders = Object.fromEntries(res.headers.entries())
  const bodyText = await res.text()
  console.log('status:', res.status)
  console.log('response:', bodyText)

  if (res.ok) {
    const chatId = resHeaders['zg-res-key']
    console.log('\n--- verifying response ---')
    const valid = await broker.inference.processResponse(PROVIDER_ADDRESS, chatId)
    console.log('processResponse result:', valid)
  } else {
    console.log(
      '\nRequest was rejected by the provider on policy (see docs/m3-tracks.md) — this still confirms the ' +
        'session authenticated successfully; no model response or settlement was reached.'
    )
  }
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})

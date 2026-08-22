#!/usr/bin/env node
// Warrant Verifier — a CLI over sdk/warrant-client's reconciliation core.
//
// This is a presentation layer, not a new trust component: every fact it
// prints comes straight from `reconcile()`/`reconcileWarrant()` reading
// public chain state through a real JSON-RPC endpoint. It holds no
// authority, checks no policy, and cannot be wrong in a way that affects
// Warrant's security — at worst it prints a misleading line, the same
// bound the library itself carries (see src/reconcile.js).
//
// Usage:
//   node bin/warrant-verify.js --tx <transferTxHash> --module <warrantModuleAddress> [--inference-serving <addr>] [--rpc <url>] [--json]
//   node bin/warrant-verify.js --warrant <id> --module <warrantModuleAddress> [--inference-serving <addr>] [--rpc <url>] [--json]
//
// Any flag not given falls back to the shared testnet deployment record at
// deployments/testnet.json (rpc, inferenceServing) — --module has no
// default because it's a per-Safe instance, not shared infrastructure; see
// docs/m3-tracks.md for the real, live Track A module address to try this
// against immediately.

const path = require('path')
const fs = require('fs')
const { reconcile, reconcileWarrant, createJsonRpcChainReader, STATUS } = require('../src/index')

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2)
      const next = argv[i + 1]
      if (next === undefined || next.startsWith('--')) {
        args[key] = true
      } else {
        args[key] = next
        i++
      }
    }
  }
  return args
}

function loadDeploymentDefaults() {
  const deploymentPath = path.join(__dirname, '..', '..', '..', 'deployments', 'testnet.json')
  try {
    const raw = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'))
    return { rpcUrl: raw.rpcUrl, inferenceServing: raw.og && raw.og.inferenceServing, source: deploymentPath }
  } catch (e) {
    return { rpcUrl: undefined, inferenceServing: undefined, source: null }
  }
}

function printHelp() {
  console.log(`
Warrant Verifier — independently reconciles a Warrant-authorized transfer
against native 0G Compute settlement events. Reads only; cannot move funds
or alter policy.

  --tx <hash>                 reconcile a single transferTxHash
  --warrant <id>               reconcile every transfer for a warrantId
  --module <address>           the WarrantModule that authorized the transfer(s) [required]
  --inference-serving <addr>   0G InferenceServing address [default: deployments/testnet.json]
  --rpc <url>                  0G RPC endpoint [default: deployments/testnet.json]
  --to-block <block>           upper bound for the settlement search [default: latest]
  --json                       print the raw report as JSON instead of a formatted summary

Try it against the real, live Track A transaction proven in M3:
  node bin/warrant-verify.js --tx 0x635cd6cca736a2df02e8734f5b8fdf6ac54fb795e83356b40207fbd28cea68d2 \\
    --module 0xf47E11f9E499994C96b0C2e9ce1b7978db9416d8
`)
}

function formatAmount(wei) {
  if (wei === null || wei === undefined) return 'n/a'
  const asString = wei.toString().padStart(19, '0')
  const whole = asString.slice(0, -18) || '0'
  const frac = asString.slice(-18).replace(/0+$/, '') || '0'
  return `${whole}.${frac} A0GI`
}

function statusLine(status) {
  switch (status) {
    case STATUS.AUTHORIZED_ONLY:
      return 'AUTHORIZED_ONLY — funded, no native settlement observed yet (or ever, for Safe-controlled transfers — see the Compute compatibility finding)'
    case STATUS.AUTHORIZED_AND_SETTLED:
      return 'AUTHORIZED_AND_SETTLED — a native settlement was found and confidently correlated to this transfer'
    case STATUS.AUTHORIZED_SETTLEMENT_UNCORRELATED:
      return 'AUTHORIZED_SETTLEMENT_UNCORRELATED — a settlement exists for this account but could not be confidently attributed to this provider; reported as ambiguous rather than guessed'
    default:
      return status
  }
}

function printReport(report, rpcUrl) {
  console.log(`\nsource: live read from ${rpcUrl}`)
  console.log(`warrantId:         ${report.warrantId}`)
  console.log(`transferTxHash:    ${report.transferTxHash}`)
  console.log(`provider:          ${report.provider}`)
  console.log(`authorizedAmount:  ${formatAmount(report.authorizedAmount)}`)
  console.log(`status:            ${statusLine(report.status)}`)
  console.log(`settlementTxHash:  ${report.settlementTxHash ?? 'null'}`)
  console.log(`teeSignerAddress:  ${report.teeSignerAddress ?? 'null'}`)
  console.log(`settledAmount:     ${formatAmount(report.settledAmount)}`)
  if (report.warnings && report.warnings.length) {
    console.log(`warnings:          ${report.warnings.join('; ')}`)
  }
  if (report.uncorrelatedCandidates && report.uncorrelatedCandidates.length) {
    console.log(`uncorrelated candidates found (not shown as the answer, shown for audit):`)
    for (const c of report.uncorrelatedCandidates) {
      console.log(`  - ${c.settlementTxHash}: ${c.reason}`)
    }
  }
  console.log(
    '\nThis report states authorization and settlement correlation only. It does not, and cannot, state\n' +
      'whether the underlying compute was correct — see docs/threat-model.md.'
  )
}

function toJsonSafe(value) {
  return JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? v.toString() : v), 2)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help || (!args.tx && !args.warrant)) {
    printHelp()
    process.exit(args.help ? 0 : 1)
  }
  if (!args.module) {
    console.error('Error: --module is required (the WarrantModule that authorized the transfer). Run with --help for an example.')
    process.exit(1)
  }

  const defaults = loadDeploymentDefaults()
  const rpcUrl = args.rpc || defaults.rpcUrl
  const inferenceServingAddress = args['inference-serving'] || defaults.inferenceServing
  if (!rpcUrl || !inferenceServingAddress) {
    console.error(
      'Error: --rpc and --inference-serving could not be resolved (no value given and deployments/testnet.json not found or incomplete).'
    )
    process.exit(1)
  }

  const reader = createJsonRpcChainReader(rpcUrl)

  try {
    if (args.tx) {
      const report = await reconcile(reader, {
        transferTxHash: args.tx,
        moduleAddress: args.module,
        inferenceServingAddress,
        searchToBlock: args['to-block'],
      })
      if (args.json) {
        console.log(toJsonSafe(report))
      } else {
        printReport(report, rpcUrl)
      }
    } else {
      const { summary, reports } = await reconcileWarrant(reader, {
        warrantId: args.warrant,
        moduleAddress: args.module,
        inferenceServingAddress,
        searchToBlock: args['to-block'],
      })
      if (args.json) {
        console.log(toJsonSafe({ summary, reports }))
      } else {
        console.log(`\nsource: live read from ${rpcUrl}`)
        console.log(`warrantId:        ${summary.warrantId}`)
        console.log(`transferCount:    ${summary.transferCount}`)
        console.log(`totalAuthorized:  ${formatAmount(summary.totalAuthorized)}`)
        console.log(`totalSettled:     ${formatAmount(summary.totalSettled)}`)
        console.log(`by status:        ${JSON.stringify(summary.countByStatus)}`)
        for (const report of reports) {
          printReport(report, rpcUrl)
        }
      }
    }
  } catch (e) {
    console.error(`\nreconciliation failed, not guessed: ${e.message}`)
    process.exit(1)
  }
}

main()

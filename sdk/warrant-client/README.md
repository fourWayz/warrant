# @warrant/client

A dependency-free reconciliation library: given a Warrant-authorized
transfer, determine whether it was ever followed by a native 0G Compute
settlement for the same (Safe, provider) pair — and if so, by which TEE
signer and for how much.

This is a pure reader. It cannot move funds, cannot alter policy, and
cannot participate in authorization. Its absence, failure, or incorrectness
never weakens Warrant's security — at worst it produces a misleading
*report*, never a bad state transition. See
`../../docs/m4-reconciliation.md` for the full design record, including
what this deliberately does not claim.

## What this library will never claim

Model identity, output correctness, and policy-following during inference
are not observable from any event or contract this library reads, and are
never reported as verified facts — see the "authorized / funded / settled /
correlated" distinction in `../../docs/m4-reconciliation.md`.

## Zero dependencies, by design

Every ABI decode in `src/` is hand-written for the one known event or
function shape it targets — this is deliberately not a general-purpose ABI
library. The reconciliation core (`src/reconcile.js`) takes a chain reader
as a parameter and never imports the network-backed implementation
(`src/chainReader.js`) itself, so tests run fully offline against fixture
data — see `test/fakeChainReader.js`.

## Usage

```js
const { reconcile, createJsonRpcChainReader } = require('@warrant/client')

const reader = createJsonRpcChainReader('https://evmrpc-testnet.0g.ai')
const report = await reconcile(reader, {
  transferTxHash: '0x...',
  moduleAddress: '0x...',       // the WarrantModule that authorized the transfer
  inferenceServingAddress: '0x...',
})
```

## Testing

```
node --test test/*.test.js
```

(`npm test` runs the same command but shells out through the OS's default
script runner, which on Windows fails from a UNC-style working directory —
run the `node --test` command directly if you hit that.)

Tests cover all three reconciliation states (`AUTHORIZED_ONLY`,
`AUTHORIZED_AND_SETTLED`, `AUTHORIZED_SETTLEMENT_UNCORRELATED`) against a
mix of real, live-captured Track A chain data
(`test/fixtures/trackA-funding-receipt.json`) and clearly-labeled synthetic
fixtures for the settlement cases no real transaction exists for yet (see
`test/fixtures/*-synthetic.json` and
`../../docs/m4-reconciliation.md`).

## Storage archival

`src/storageArchive.js` is isolated from the reconciliation core entirely —
it computes a local, tamper-evident content hash and defines the upload
boundary, but does not perform a real 0G Storage upload (that requires 0G's
own SDK, intentionally not added as a dependency this milestone). See the
module's own header comment for the exact scope.

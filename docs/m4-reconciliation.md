# M4 — Reconciliation layer

Implements the architecture approved in the M4 reassessment: the missing
audit half of Warrant's own thesis. *"Anyone should be able to
independently verify what a Warrant authorized against what 0G actually
settled."* This document is the design and verification record;
`sdk/warrant-client/` is the implementation.

## The boundary, stated once, plainly

**Warrant verifies authorization and settlement correlation. It does not
verify compute quality.**

Nothing in this library, in any report it produces, or in any field name
it uses should ever be read as a claim about whether the right model ran,
whether the input was honored, whether the output was correct, or whether
the provider followed any policy during execution. Those claims are not
observable from anything this library reads, and are not made.

## Four states, never collapsed into one

The temptation with a reconciliation tool is to compress everything into
"did it work?" This one deliberately keeps four distinct facts separate,
because collapsing them is exactly how a misleading claim slips in:

| State | Meaning | Where it's established |
|---|---|---|
| **Authorized** | WarrantModule/WarrantRegistry agreed the (provider, amount) was within policy | `SpendRecorded` / `TransferExecuted` events, from M1–M3 |
| **Funded** | The authorized transfer actually landed in the provider's `InferenceServing` sub-account | Same transaction, same events — authorized and funded happen atomically today |
| **Settled** | 0G's own `settleFeesWithTEE` processed a claim against that sub-account | `TEESettlementResult` event, entirely outside Warrant's control (M3.0 finding) |
| **Correlated** | This library could confidently tie a specific settlement to a specific Warrant-authorized transfer | Calldata-position matching, described below — the one place genuine uncertainty exists |

A report only ever claims the first three as facts. The fourth is reported
honestly as sometimes uncertain — see `AUTHORIZED_SETTLEMENT_UNCORRELATED`
below — rather than forced into a guess.

## Report schema

```
{
  warrantId: bigint,
  transferTxHash: string,
  provider: string,
  authorizedAmount: bigint,
  settlementTxHash: string | null,
  teeSignerAddress: string | null,
  settledAmount: bigint | null,
  status: "AUTHORIZED_ONLY" | "AUTHORIZED_AND_SETTLED" | "AUTHORIZED_SETTLEMENT_UNCORRELATED",
  warnings: string[],
  uncorrelatedCandidates?: { settlementTxHash, reason }[]  // only present for the UNCORRELATED status
}
```

No field for model, output, or policy verification exists in this schema,
on purpose.

## Where every fact in a report actually comes from

| Field | Source | Derived or raw? |
|---|---|---|
| `warrantId`, `provider`, `authorizedAmount` | `WarrantModule.TransferExecuted` event (real, on-chain) | Raw |
| `settlementTxHash` | The transaction containing a correlated `TEESettlementResult` | Raw |
| `teeSignerAddress` | `InferenceServing.ProviderTEESignerAcknowledged` event, most recent before the settlement block | Raw |
| `settledAmount` | `totalFee` (from the settlement transaction's own calldata) minus `unsettledAmount` (from the real `TEESettlementResult` event) | **Derived** — arithmetic on two directly-observed on-chain values, never assumed equal to `authorizedAmount` |

`settledAmount` is the one derived field, and it's derived from two facts
that were each independently read from chain data, not inferred from
context or assumed.

## Why correlation needs calldata decoding, not just the settlement event

`TEESettlementResult(address indexed user, uint8 status, uint256 unsettledAmount)`
does not carry a `provider` field — confirmed by reading the deployed
`InferenceServing` ABI directly during M0–M3, not assumed from
documentation. `settleFeesWithTEE` accepts a `TEESettlementData[]` array
(one entry can cover any provider for that user), so a batch settlement for
a given Safe can span multiple providers in one transaction. Provider
identity for a given settlement event has to come from somewhere — this
library decodes the settlement transaction's own calldata and matches it
positionally against the ordered list of `TEESettlementResult` logs in the
same transaction receipt.

### Open ambiguity, disclosed rather than papered over

Two things are assumed, not directly confirmed, because no real settlement
transaction has occurred on testnet to check them against (Track B stopped
at a provider funding requirement before reaching settlement — see
`docs/m3-tracks.md`):

1. **`TEESettlementResult` events are emitted in the same order as the
   input `TEESettlementData[]` array.** This is the standard Solidity
   pattern for a function returning one status per input item
   (`previewSettlementResults` returns parallel arrays the same way), and
   is treated as reliable — but it has not been observed in a real
   multi-item settlement.
2. **Whether `BalanceUpdated` also fires on settlement**, not just on
   funding. Confirmed firing on the funding path live in M3 (Track A);
   never observed on a settlement path. This library does **not** rely on
   it for correlation for exactly that reason — calldata decoding was
   chosen as the primary mechanism specifically because it rests only on
   confirmed facts (the calldata *is* what was submitted) plus the one
   named assumption above, rather than on an unconfirmed event-firing
   assumption.

Both are flagged here rather than silently built into a correlation rule
presented as certain. Whenever a real settlement transaction is eventually
observed (e.g. if Track B is completed with more funding), both should be
checked against it and this section updated.

## Event/selector verification record

Every topic0 and selector `src/constants.js` hardcodes was computed with
`cast sig-event` / `cast sig` against the exact signatures in the deployed
contracts, then checked against real data before being trusted:

| Constant | Verified against |
|---|---|
| `TRANSFER_EXECUTED`, `SPEND_RECORDED`, `BALANCE_UPDATED` | Decoded correctly against the real logs in `test/fixtures/trackA-funding-receipt.json` (the actual M3 `executeTransfer` transaction) |
| `SAFE_GETTER` (`safe()`) | Called live against the real deployed `WarrantModule` (`0xf47E11f9E499994C96b0C2e9ce1b7978db9416d8`) during M4 development; returned the exact known Safe address |
| `SETTLE_FEES_WITH_TEE` selector, and the calldata decoder itself | Checked against `cast calldata` output for the real function signature, round-tripped through the decoder before being hardcoded in any fixture |
| `TEE_SETTLEMENT_RESULT`, `PROVIDER_TEE_SIGNER_ACKNOWLEDGED` | Computed correctly from the confirmed event signatures (M0–M3 ABI record); **not yet confirmed against a real fired event** — no real settlement exists yet. Their field layout (which fields are indexed) was taken directly from the deployed `InferenceServing` ABI extracted in M2, not guessed. |

## Storage archival scope

`sdk/warrant-client/src/storageArchive.js` is isolated from the
reconciliation core by construction — nothing in `reconcile.js` imports it
or is aware it exists. It computes a local SHA-256 content hash (Node's
built-in `crypto`, no new dependency) for tamper-evidence, and defines the
injection point a real uploader would plug into. It does not perform a
real 0G Storage upload: that requires 0G's own Storage SDK, for its
specific Merkle-root content-addressing scheme, which is intentionally not
added as a dependency this milestone. **This module is never described as
proving the archived content is true** — only that whatever is retrieved
later matches the hash computed at archival time.

## What M4 explicitly does not do

Per the approved M4 architecture: no 0G DA, no deeper ERC-7857
(`authorizeUsage()`/`clone()`), no Safe/Compute authentication workaround,
no new enforcement layer, no provider-quality/model-identity/output
verification, no ERC-8004 dependency, no provider-registry cross-check.

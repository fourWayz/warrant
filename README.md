# Warrant

Warrant is an on-chain spend-authorization and audit protocol for AI agents
using 0G Compute. It enforces one boundary: an agent wallet may not fund a
0G Compute provider account beyond the policy its owner set for it, and
anyone can independently audit what was authorized against what 0G actually
settled afterward.

Warrant does not replace 0G Compute's native settlement. It controls the
single call that moves funds toward a provider —
`LedgerManager.transferFund(provider, serviceName, amount)` — and leaves
`InferenceServing.settleFeesWithTEE` exactly as 0G built it.

## What Warrant enforces

- provider allowlist
- per-warrant spend cap and remaining-budget accounting
- expiry and revocation
- that a warrant goes stale the moment its Agentic ID changes owners

## What Warrant does not, and cannot, enforce

- output quality or correctness of a compute response
- that a provider executes at all once funded
- model identity, model checkpoint, or model lineage
- anything about native settlement once funds reach a provider's sub-account

See `docs/threat-model.md` for the full boundary and `docs/bypass-analysis.md`
for every path considered and why it is either governed by Warrant or
explicitly out of scope.

## Try it against real, live Galileo data right now

```
cd sdk/warrant-client
node bin/warrant-verify.js --tx 0x635cd6cca736a2df02e8734f5b8fdf6ac54fb795e83356b40207fbd28cea68d2 \
  --module 0xf47E11f9E499994C96b0C2e9ce1b7978db9416d8
```

That transaction is real — the actual Track A transfer proven live in M3.
The CLI reads it directly from 0G Galileo and reports
`AUTHORIZED_ONLY`: funded, no native settlement ever observed, exactly as
honest given the Compute compatibility finding below. Nothing here is
canned output.

## Evidence labeling

Used consistently across this README and `docs/`:

| Label | Means |
|---|---|
| **LIVE / VERIFIED ON 0G** | Read directly from Galileo via a real RPC call |
| **VERIFIED AGAINST SOURCE** | Confirmed against 0G's actual deployed contract source/ABI or a captured real transaction |
| **SYNTHETIC TEST FIXTURE** | Constructed for testing, always disclosed as such in the fixture itself |
| **NOT CURRENTLY PROVABLE** | Not observable from any event or contract 0G exposes today |
| **FUTURE EXTENSION** | Deliberately not built yet |

## Repository layout

```
contracts/     Foundry project — WarrantRegistry, WarrantModule, invariant fuzz suite, deploy scripts
sdk/           warrant-client: dependency-free reconciliation library + CLI verifier (M4/M5)
apps/explorer  Public, read-only verifier (FUTURE EXTENSION)
services/indexer  Log-decoding helper for the explorer (FUTURE EXTENSION)
docs/          Threat model, bypass analysis, design notes
deployments/   Version-controlled record of every deployed address, per chain
```

## Status

M0–M5 complete. M0–M2: repository scaffold, testnet infrastructure,
`WarrantRegistry`, `WarrantModule`, and the adversarial test suite (46
tests). M3: Warrant's core security boundary proven live on real 0G Galileo
contracts (see `docs/m3-tracks.md`), and a compatibility investigation into
0G Compute's own request/settlement flow (see
`docs/compute-compatibility-finding.md`). M4: the read-only reconciliation
layer (`sdk/warrant-client`) that correlates a Warrant-authorized transfer
against native 0G settlement events — see `docs/m4-reconciliation.md`. M5:
a CLI verifier over that same library, warrant-level (not just
single-transfer) reconciliation, and a property-based fuzz suite proving
the spend-cap and allowlist invariants across 128,000 randomized calls with
zero violations — see `docs/m5-verifier.md`.

**M3 conclusion:** Warrant's core security boundary is proven on real 0G
infrastructure — a Safe-controlled agent cannot authorize provider funding
outside its owner-defined Warrant policy. 0G Compute's current inference
authentication requires the funded account itself to possess an ECDSA
private key, making Safe-based inference authentication incompatible with
the current public Compute flow. Warrant does not claim to control native
Compute settlement; the incompatibility is documented as an ecosystem
integration boundary, not hidden or worked around.

**M4 conclusion:** Warrant verifies authorization and settlement
correlation. It does not verify compute quality. The reconciliation layer
never moves funds, never alters policy, and its own failure or absence
cannot weaken anything M1–M3 already proved — see
`docs/m4-reconciliation.md` for the authorized/funded/settled/correlated
distinction this rests on.

**M5 conclusion:** the audit half of Warrant's thesis is now something
anyone can run themselves, against real Galileo data, without trusting a
backend — and the enforcement half has been checked against 128,000
randomized adversarial call sequences, not just the cases written by hand.
Neither changes what Warrant claims; both make the existing claims easier
to verify and harder to doubt. See `docs/m5-verifier.md`.

0G DA, deeper ERC-7857 integration, ERC-8004 interop, a hosted public
explorer, a real 0G Storage uploader, and any Warrant extension (delegated
capability graphs, fine-tune lineage, provider bonding) remain future
extensions, not started — see the M4 architecture reassessment for why
each was deferred or rejected.

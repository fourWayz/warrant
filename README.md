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

## Repository layout

```
contracts/     Foundry project — WarrantRegistry, WarrantModule, tests, deploy scripts
sdk/           TypeScript client for creating and querying warrants
apps/explorer  Public, read-only verifier
services/indexer  Log-decoding helper for the explorer
docs/          Threat model, bypass analysis, design notes
deployments/   Version-controlled record of every deployed address, per chain
```

## Status

M0–M3 complete. M0–M2: repository scaffold, testnet infrastructure,
`WarrantRegistry`, `WarrantModule`, and the adversarial test suite (46
tests). M3: Warrant's core security boundary proven live on real 0G Galileo
contracts (see `docs/m3-tracks.md`), and a compatibility investigation into
0G Compute's own request/settlement flow (see
`docs/compute-compatibility-finding.md`).

**M3 conclusion:** Warrant's core security boundary is proven on real 0G
infrastructure — a Safe-controlled agent cannot authorize provider funding
outside its owner-defined Warrant policy. 0G Compute's current inference
authentication requires the funded account itself to possess an ECDSA
private key, making Safe-based inference authentication incompatible with
the current public Compute flow. Warrant does not claim to control native
Compute settlement; the incompatibility is documented as an ecosystem
integration boundary, not hidden or worked around.

DA archival, Storage, ERC-8004 interop, the public explorer, and any
Warrant extension (delegated capability graphs, fine-tune lineage, provider
bonding) are later milestones, not started.

# M5 — Warrant Verifier and invariant hardening

M5 adds nothing to what Warrant proves. It makes what M1–M4 already proved
inspectable by anyone, and raises confidence in the core enforcement
invariants from "held for every case we wrote by hand" to "held across
thousands of randomized, adversarially-interleaved sequences." No contract
changed. No new 0G primitive was introduced.

## What was built

**1. `reconcileWarrant(reader, params)`** (`sdk/warrant-client/src/reconcile.js`)
Given a `warrantId`, finds every transfer ever authorized under it — one
`eth_getLogs` query on `WarrantModule`'s indexed `TransferExecuted` topic,
not a scan — and reconciles each with the existing `reconcile()`, rolling
the results into a summary (`transferCount`, `totalAuthorized`,
`totalSettled`, `countByStatus`). Pure composition of already-tested logic;
no new correlation rule.

**2. `bin/warrant-verify.js`** — a CLI over both functions. Reads defaults
(`rpcUrl`, `inferenceServing`) from `deployments/testnet.json` so a full
command only needs a tx hash and a module address. Holds no authority: it
cannot move funds or alter policy, and its own bugs, if any, can only ever
produce a misleading printed line, never a bad state transition — the same
bound `reconcile()` itself carries.

**3. Browser/Node-agnostic core.** `abiCodec.js`'s one Node-specific call
(`Buffer.from(...).toString('utf8')`) was replaced with `TextDecoder`,
which exists as a global in both Node 18+ and every modern browser. The
reconciliation core now has zero runtime-environment dependency, not just
zero npm dependency — laying groundwork for a future browser verifier
without committing to building one this milestone.

**4. `contracts/test/adversarial/WarrantRegistry.invariants.t.sol`** — a
Foundry invariant suite. A handler drives randomized sequences of warrant
creation, provider-allowlist edits, budget changes, revocation, Agentic ID
ownership transfers, and spend attempts against a real `WarrantRegistry`,
and after every successful spend independently re-derives whether every
policy condition (provider allowed, active, in-window, ownership
unchanged, within budget) actually held — recording a violation if a
success wasn't backed by all five. Three invariants assert: the budget cap
was never exceeded, no such violation was ever recorded, and warrant
identity never drifted.

## Why this M5 over the alternatives

Considered and rejected: a real 0G Storage upload (unverified SDK risk,
low demo value), an ERC-8004 registry post (unverified deployment on
Galileo, low value beyond what already exists), deeper ERC-7857 use
(already correctly rejected in the M4 architecture review — reopening it
would add a false-signal risk, not a guarantee). All three would have
added a new external dependency for a smaller payoff than making the
already-audited logic something a judge can run themselves against real,
already-proven Galileo data. See the M5 proposal thread for the full
comparison table.

## Evidence labeling, used consistently across this project's docs from here on

| Label | Means |
|---|---|
| **LIVE / VERIFIED ON 0G** | Read directly from Galileo via a real RPC call, right now — e.g. every `warrant-verify.js` run against a real tx hash |
| **VERIFIED AGAINST SOURCE** | Confirmed by reading 0G's actual deployed contract source/ABI or a real captured transaction, not assumed from documentation |
| **SYNTHETIC TEST FIXTURE** | Constructed for testing because no real transaction of that shape exists yet — always disclosed in the fixture's own `_source` field |
| **NOT CURRENTLY PROVABLE** | Not observable from any event or contract 0G exposes today (model identity, output correctness, provider execution) |
| **FUTURE EXTENSION** | Deliberately not built this milestone (real Storage upload, ERC-8004 posting, a browser verifier) |

## What is still synthetic after M5, stated plainly

`AUTHORIZED_AND_SETTLED` and `AUTHORIZED_SETTLEMENT_UNCORRELATED` are still
demonstrated only against the synthetic fixtures built in M4
(`test/fixtures/settled-synthetic.json`, `uncorrelated-synthetic.json`).
M5 did not attempt to obtain a real settlement — that path is
funding/network-dependent exactly as it was when Track B stopped short of
it, and was assessed as the wrong risk/reward trade for this milestone.
Running `warrant-verify.js` against the real Track A transaction correctly
and honestly reports `AUTHORIZED_ONLY` for exactly that reason — see
`docs/compute-compatibility-finding.md`.

# Bypass analysis — end of M2

Every way an owner, module, compromised agent, or external caller could
cause the Safe to transfer funds toward a 0G Compute provider, and why each
path is either governed by Warrant or intentionally outside its threat
model. Backed by the test suites in `contracts/test/unit/`, not asserted on
its own.

## Paths into `LedgerManager.transferFund`

There are exactly three ways a call to `transferFund` can ever originate
from a Warrant-controlled Safe:

### 1. Through `WarrantModule.executeTransfer`

The intended path. `executeTransfer` looks up `executorWarrant[msg.sender]`;
an address with no binding gets `NotAuthorizedExecutor` immediately
(`test_nonExecutor_cannotSpendAtAll`). A bound executor's call is checked
against the registry's provider allowlist, service allowlist, expiry,
revocation, and remaining budget before the module ever builds the
`transferFund` calldata — and the state-changing budget update happens
before that external call, so any failure downstream (insufficient ledger
balance, a native revert) unwinds the budget change too
(`test_insufficientFunds_revertsWholeTransaction_budgetUntouched`).

**Governed by Warrant.**

### 2. Through `Safe.execTransaction` directly (an owner-signed transaction)

Any Safe owner can sign a transaction targeting `LedgerManager.transferFund`
directly, with no reference to WarrantModule or WarrantRegistry at all. This
is not a flaw in the module — it is the Safe's own owner-signature path,
which no module can intercept without a Guard (see below), and which
Warrant deliberately does not attach a Guard to for MVP.

**Explicitly outside Warrant's threat model.** This is why the operational
rule in `docs/threat-model.md` — the agent's key must never be a Safe owner
— is load-bearing, not advisory. Warrant's enforcement boundary is the
delegated agent key, not the wallet owner, by design.

### 3. Through some other enabled Safe module

If a second, unrelated module were enabled on the same Safe, it could call
`execTransactionFromModule` targeting `transferFund` with no policy check at
all. WarrantModule cannot see or restrict what other modules a Safe chooses
to enable.

**Explicitly outside Warrant's threat model**, and outside any individual
module's reach by construction — Safe modules are independent of each
other. The operational mitigation is the same as for owners: only enable
modules you trust with unrestricted spend authority, and treat
WarrantModule as the *only* module with any relationship to compute spend.

## Could a compromised executor do anything WarrantModule doesn't check?

No parameter reaches `LedgerManager` that WarrantModule did not itself
construct. `executeTransfer` takes `(provider, serviceName, amount)` as
plain values and builds the call with `abi.encodeCall`; there is no target
address, no raw calldata, and no fallback function on the module a caller
could route an arbitrary call through
(`test_moduleHasNoFunctionAcceptingArbitraryTargetOrCalldata`,
`test_executorCannotRedirectSpendToArbitraryContractOutsideLedgerManager`).
A compromised executor's only leverage is the three values it's allowed to
choose — provider, service, amount — and all three are checked before the
call is built.

## Could the registry itself be tricked?

- **Wrong module calling `recordSpend`:** rejected — `recordSpend` checks
  `msg.sender == warrant.boundModule`, set once at creation, immutable
  (`test_recordSpend_callerNotBoundModule_reverts`).
- **Stale ownership:** a warrant's owner selling or transferring the
  Agentic ID does not require any action from anyone — the very next spend
  attempt fails (`test_warrantGoesStaleImmediatelyAfterTransfer_evenWithoutRevocation`,
  `test_previousOwnerAfterNftTransfer_cannotSetNewExecutor`).
- **Reentrancy through a malicious Agentic ID's `ownerOf`:** the registry
  reaches `ownerOf` only through an interface call declared `view`, which
  Solidity compiles to `STATICCALL`; any attempted state change inside a
  malicious implementation's `ownerOf` fails
  (`test_maliciousAgenticId_cannotReenterThroughOwnerOfCheck`). The registry
  makes no other external call and needs no reentrancy guard by
  construction — `WarrantModule` still carries one as defense-in-depth,
  since it does make a real external call to the Safe.

## What none of this claims

This analysis says nothing about whether a provider funded through an
authorized transfer actually does anything with the money, or whether
`InferenceServing.settleFeesWithTEE` releases it fairly. Those are 0G's
contracts, unmodified, and outside every path above — see
`docs/threat-model.md` for that half of the boundary.

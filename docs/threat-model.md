# Threat model

Warrant enforces one boundary: an agent wallet may not call
`LedgerManager.transferFund` outside the policy its owner set. Everything on
either side of that boundary follows a different set of rules.

## Governed by Warrant

| Threat | Mechanism |
|---|---|
| Unauthorized provider spend | `WarrantRegistry.recordSpend` checks the provider allowlist before any transfer is built |
| Spend beyond the cap | `recordSpend` checks `spentAmount + amount <= maxTotalSpend`, atomically, before the transfer executes |
| Concurrent overspend | EVM transactions serialize; the check-then-write in `recordSpend` happens in one call, so a second concurrent spend sees the already-updated `spentAmount` |
| Expired warrant usage | `recordSpend` reverts once `block.timestamp > expiry` |
| Revoked warrant usage | `recordSpend` reverts once `active == false` |
| Stale warrant after Agentic ID transfer | `recordSpend` reverts once `ownerOf(tokenId) != ownerAtCreation`, from the first spend attempt after the transfer, with no separate action required |
| Policy edit by a former owner | Every mutating function re-checks `ownerOf(tokenId) == msg.sender` live, never a cached value |
| Executor acting outside its bound warrant | `WarrantModule.executeTransfer` looks up `executorWarrant[msg.sender]`; an address with no binding cannot spend anything |

## Explicitly outside Warrant's threat model — native 0G behavior

| Threat | Why Warrant cannot address it |
|---|---|
| Provider returns a bad or unusable response | `InferenceServing.settleFeesWithTEE` pays on a valid TEE usage signature, not response quality. No contract wrapper changes this. |
| Provider never executes after being funded | Once `transferFund` succeeds, funds are in the provider's sub-account; recovery is 0G's native `requestRefundAll` → `processRefund` path, gated by `InferenceServing.lockTime`. |
| Provider settles after the warrant is revoked | Revocation blocks *future* `transferFund` calls only. Funds already in a sub-account are settled entirely through 0G's native, provider-triggered `settleFeesWithTEE`. |
| TEE signer compromise | Inherited from 0G's own trust boundary; Warrant does not attest to or verify TEE hardware. |
| Model identity, checkpoint, or lineage | Out of scope by design — see the project README. A future, separate protocol, not Warrant. |

## Explicitly outside Warrant's threat model — operational assumptions

These are not contract guarantees. They are preconditions the deployment
tooling should check and the documentation states loudly:

| Assumption | If violated |
|---|---|
| The agent's operational key is registered only as a `WarrantModule` executor, never as a Safe owner | An agent-owner key can call `Safe.execTransaction` directly and bypass the module entirely — this is not a bug in the module, it is the Safe's own owner-signature path, which Warrant does not and should not touch |
| The owner never funds a 0G ledger account the agent's own EOA directly controls | Funds sitting under the agent's own address are outside the Safe and outside Warrant's reach entirely |

The owner retains sovereign override authority over their own Safe at all
times. Warrant's enforcement boundary is the delegated agent key, not the
wallet owner — a deliberate choice, not an oversight.

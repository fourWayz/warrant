# WarrantRegistry — frozen interface and invariants

Written before implementation, per the M1 design freeze. Any change to the
policy interface after this point must update this file in the same commit.

## Identity anchor

A warrant is not owned directly. It is anchored to an external
`(agenticIdContract, tokenId)` pair. Authority to create, update, or revoke a
warrant is always re-derived from `IERC721(agenticIdContract).ownerOf(tokenId)`
at call time — never cached as a standing permission.

## Struct

```solidity
struct Warrant {
    uint256 id;
    address agenticIdContract;
    uint256 tokenId;
    address ownerAtCreation;   // re-checked against current ownerOf() on every spend
    address boundModule;       // the one WarrantModule allowed to call recordSpend
    uint256 maxTotalSpend;
    uint256 spentAmount;
    uint64  startTime;
    uint64  expiry;
    bool    active;
    uint32  version;
}
```
Provider and service allowlists are stored in separate mappings keyed by
warrant id, not inline in the struct, so they can grow without bounding the
struct's storage cost.

## Invariants

1. **I1 — Live ownership, not cached ownership.** `createWarrant`, `updateWarrant`,
   and `revokeWarrant` all require `msg.sender == ownerOf(tokenId)` evaluated
   at call time. A previous owner's authority ends the instant the token
   moves, with no separate revocation step required.
2. **I2 — Spend requires live ownership too.** `recordSpend` also requires
   `ownerOf(tokenId) == warrant.ownerAtCreation`. If the Agentic ID has
   changed hands since the warrant was created, every subsequent spend
   attempt reverts, even if nobody has touched the warrant itself. A warrant
   goes stale automatically on transfer; the new owner must create a fresh
   one to resume spending.
3. **I3 — Single writer.** Only `warrant.boundModule` may call `recordSpend`
   for that warrant. The binding is set once, at creation, and is immutable.
4. **I4 — Monotonic budget.** `spentAmount` only increases, is checked before
   it is written, and can never exceed `maxTotalSpend`. There is no path that
   decreases `spentAmount` other than creating a new warrant.
5. **I5 — Default-deny.** A provider or service not explicitly allowlisted is
   rejected. There is no wildcard-allow state.
6. **I6 — Time-boundedness.** `recordSpend` reverts once `block.timestamp >
   expiry`, unconditionally, regardless of remaining budget.
7. **I7 — Revocation is immediate and one-way within a version.** Once
   `active == false`, no spend succeeds until a new warrant (new id) is
   created. Revocation does not reset `spentAmount` or reuse the id.
8. **I8 — Every state transition emits an event.** Creation, update,
   revocation, and spend all emit an indexed event carrying enough data for
   an external indexer to reconstruct the full policy history without
   reading storage directly.

## What the registry deliberately does not do

- It does not verify anything about the compute request itself (model,
  input, output). It only ever sees `(provider, amount)`.
- It does not hold funds. It is pure policy state; `WarrantModule` is what
  actually moves value, and only through the bound Safe.
- It does not interpret ERC-7857's `authorizeUsage()` bytes field. Agentic ID
  is used exclusively as an ownership anchor via `ownerOf()`.

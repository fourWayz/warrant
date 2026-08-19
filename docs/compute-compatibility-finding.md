# M3.0 — Safe ↔ 0G Compute identity compatibility finding

## Verdict: SAFE_INCOMPATIBLE

The current public 0G Compute request/authentication flow cannot accept a
Safe as the identity that both funds and makes inference calls. This is not
a missing feature; it is a mathematical property of ECDSA signature
recovery combined with how 0G's provider-side code verifies sessions today.
No adapter — thin or otherwise — can bridge it without either forging a
signature (impossible) or 0G changing their own broker code (outside our
control, and explicitly outside this project's scope).

## The mechanism, read from source, not documentation

Two repositories were cloned and read directly:
[`0glabs/0g-serving-broker`](https://github.com/0glabs/0g-serving-broker)
(provider-side, Go) and
[`0gfoundation/0g-compute-ts-sdk`](https://github.com/0gfoundation/0g-compute-ts-sdk)
(client-side, TS).

**Client** — `src.ts/sdk/inference/broker/base.ts`:
```ts
const signature = await this.contract.signer.signMessage(
    Buffer.from(messageHash.slice(2), 'hex')
)
```

**Server** — `api/inference/internal/ctrl/request.go`, `ValidateSession`, run
before any request is created or billed:
```go
prefixedMsg := crypto.Keccak256Hash([]byte("\x19Ethereum Signed Message:\n32"), messageHash.Bytes())
pubKey, err := crypto.SigToPub(prefixedMsg.Bytes(), append(sigBytes[:64], v1))
recoveredAddr := crypto.PubkeyToAddress(*pubKey)
if !strings.EqualFold(recoveredAddr.Hex(), address) { /* reject */ }
```
followed immediately by `validateTokenRevocation`, which takes that same
address and calls `InferenceServing.getAccount(userAddress, provider)` —
the exact on-chain account `transferFund` funded.

A full-repository search for `1271` / `isValidSignature` in both codebases
returned zero matches in the session/billing path. The one EIP-1271-shaped
interface that exists (`ISignatureVerifier` in the fine-tuning contract
bindings) is unused scaffolding for a different flow; its real call sites
also use `crypto.SigToPub` directly.

## Why this can't be adapted around

`crypto.SigToPub` recovers whichever address corresponds to the private key
that actually produced the signature. A Safe has no private key — its
address is never reachable via ECDSA recovery, regardless of what bytes a
client sends. No signature construction, on the Safe's behalf or otherwise,
can make `recoveredAddr.Hex() == safeAddress` true. This is true independent
of SDK version, independent of client cleverness.

A "fund a separate EOA instead" adapter was considered and rejected: once
value is deposited into that EOA's own ledger balance
(`LedgerManager.depositFundFor`), *that EOA* — not WarrantModule — decides
which provider its own subsequent `transferFund` call reaches. That
converts an atomically-enforced, on-chain provider allowlist into an
operational assumption, which is exactly the kind of quiet weakening this
project's constraints rule out.

## The concrete, stark fact

**A Warrant-funded Safe sub-account on 0G Compute today can receive funds
but can never spend them through the standard inference flow.** Confirmed
live on testnet in M3.2 (Track A): 0.01 A0GI sits in a real
`InferenceServing` sub-account for a Safe address, correctly and verifiably
Warrant-authorized — and is permanently unreachable by any inference
request, because no session token can ever authenticate as that address.
The only way to get it back is 0G's native
`requestRefundAll` → `processRefund` path.

## Conclusion

Warrant's core security boundary is proven on real 0G infrastructure: a
Safe-controlled agent cannot authorize provider funding outside its
owner-defined Warrant policy. 0G Compute's current inference authentication
requires the funded account itself to possess an ECDSA private key, making
Safe-based inference authentication incompatible with the current public
Compute flow. We therefore do not claim that Warrant controls native
Compute settlement. The incompatibility is documented as an ecosystem
integration boundary rather than hidden or worked around.

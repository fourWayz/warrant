# M3.2/M3.3 — Track A and Track B, run live against 0G Galileo

See `docs/compute-compatibility-finding.md` for the compatibility verdict
and its conclusion; this document is the run record backing it.

Two deliberately separate flows. Track A is what Warrant controls and
enforces. Track B is what native 0G Compute does on its own, run through an
identity Warrant has no relationship to whatsoever. Nothing here implies
Track A pays for or authorizes Track B — see
`docs/compute-compatibility-finding.md` for why they can't be the same
flow.

```
TRACK A                                            TRACK B
Warrant-controlled authorization                   Native Compute reference
Safe → WarrantModule → transferFund                EOA → 0G Compute → session auth
   → real 0G provider sub-account                     → provider policy evaluated
   ✓ VERIFIED, on real testnet contracts               ✓ session authenticated
                                                        ✗ settlement not reached — see below
```

## Track A — fully verified, live on 0G Galileo (chainId 16602)

| Role | Address |
|---|---|
| MockAgenticId (stand-in ERC-721 — no real Agentic ID/ERC-7857 collection is deployed on 0G yet) | `0x082F6a345A089fe4C27e2fF7bbcdA4ED72BB82cA` |
| Safe (owner-controlled, module enabled) | `0x7F11f64A7d470D2B0a49cAc36837ffa49f8c63e9` |
| WarrantModule | `0xf47E11f9E499994C96b0C2e9ce1b7978db9416d8` |
| WarrantRegistry (from M0) | `0xbd245E37b938D459C08f1c1f6F26028FDd8A98eD`, warrant id `1` |
| Owner | `0x8ce1060e4fC5010D000390Ef87D0821d7c717bB1` |
| Executor (agent key, never a Safe owner) | `0xE18638Fd5D1E70f6F460e5Da47914fF7f6A5f1b1` |
| Allowlisted provider | `0x87a13337F0d4B2b08cce9189DBE9555690828ed4` (real, already-registered 0G Compute provider — confirmed via `InferenceServing.getAllServices` before writing any test) |

### Sequence

| Step | Tx hash |
|---|---|
| Deploy MockAgenticId + mint token 1 | `0x7b942587d8708216b9ce4665885eb5bb0fa1632ba222e3116665246ccf950796` |
| Create Safe proxy | `0x8951b65818c87201486c8d93417471d4d9d3a81b38c74f1edfbe4c736ec03638` |
| Deploy WarrantModule | `0x0b294a229fffa5b75534687f0ab9295c280301da9454288a926befc5701d37eb` |
| Enable module (owner-signed) | `0x05b4b7fe4e602fa0365130132c6af7eaec122ed2899f3961f4c7ca1043dda588` |
| Create warrant (provider allowlist = [above], cap 0.05 A0GI) | `0x8be9fdf95d6c1ba4f7def35f6176b03e5cbf89cebdf7647e3de93059dace5181` |
| Set executor (owner-signed) | `0x77ee2dae9632722a69ada4443b948b427973add9bdaf31d4bf406a95cc820831` |
| Fund Safe's real ledger, 0.1 A0GI (`depositFundFor`) | `0x6fdf4f747529967a45c480c5d9a76253f8097bb8e303aae6cd7a245ccf2db9c9` |
| **executeTransfer(allowedProvider, "inference-v1.0", 0.01 A0GI) — succeeds** | `0x635cd6cca736a2df02e8734f5b8fdf6ac54fb795e83356b40207fbd28cea68d2` |

Independently re-verified afterward with plain `cast call` reads, not
trusted from the script's own trace:
- `InferenceServing.getAccount(safe, provider)` → balance `0.01 A0GI`, exactly and only the Warrant-authorized amount.
- `LedgerManager.getLedger(safe)` → available `0.09`, total `0.1` A0GI.
- `Safe.isModuleEnabled(module)` → `true`.
- `WarrantRegistry.remainingBudget(1)` → `0.04 A0GI` (`0.05` cap − `0.01` spent).

### Negative paths (M3.3 #2, #3, #5) — each a real call against the live contracts

| Test | Result |
|---|---|
| Disallowed provider (`0xA02b95Aa6886b1116C4f334eDe00381511E31A09`, a real but non-allowlisted provider) | Rejected before broadcast: `ProviderNotAllowed(1, 0xA02b95Aa6886b1116C4f334eDe00381511E31A09)` |
| Amount above remaining budget (0.05 A0GI vs. 0.04 remaining) | Rejected before broadcast: `BudgetExceeded(1, 50000000000000000, 40000000000000000)` |
| Revoke warrant (owner) | Real tx: `0xf6f4575a925fd17d6417fb9c61d347c9b8a4106c132e038042b3000d8a59719b` |
| Spend attempt after revocation | Rejected before broadcast: `WarrantNotActive(1)` |

("Rejected before broadcast" means `cast send`'s own gas-estimation
simulation reverted with the exact custom error shown — the transaction was
never even mined. That's a *stronger* guarantee than a mined revert, not a
weaker one: the funds were never at risk at any point, not even for one
block.)

M3.3 #7 (owner can still bypass the module) and #6 (concurrent-transfer
atomicity) are not re-demonstrated live here — they were proven in M2's
46-test suite against a real, freshly-deployed Safe, and nothing about
running against the live testnet contracts instead of local ones changes
that reasoning. #7 remains a documented threat-model boundary, not
something to "fix" — see `docs/threat-model.md`.

### One accidental artifact, disclosed rather than hidden

A duplicate invocation of the deploy script (a re-run I issued by mistake
to re-read console output, killed mid-flight) left a second, incomplete,
inert deployment on testnet: `MockAgenticId` at
`0xe44e51d1696a0726700c7aa9f97c069adb70b30d`, `Safe` at
`0xf66e36ce8154058d5bbbb4e5d88ea57e2c87c313`, `WarrantModule` at
`0xd235fd9f1b7f24b6a335a58dc2aef4cb1cce79f4`. Its module was never enabled
and no warrant was ever created against it — it holds no funds and can
authorize nothing. It costs nothing to leave alone and is noted here so it
doesn't look unexplained to anyone reading chain history later.

## Track B — partially verified; stopped at a real funding wall, not a design problem

EOA: `0xEE06fB1d308665e7e8154Dc64aeB8d6D168F457e` — funded by a plain wallet
transfer from the deployer key, never through WarrantModule, never
representing itself as Warrant-governed.

**What actually happened, in order:**

1. Opened a real `LedgerManager` main-ledger account at the live minimum (0.1 A0GI) — tx `0x726d9ff49e9dc97c2cc7c362ffa073ed45e6ead7ebc14964f8138d6a98bb3c45`.
2. Opened a real `InferenceServing` sub-account with the first candidate provider (`0x87a13337...`, "Qwen2.5-0.5B-Instruct") — tx `0xaca7307124308106c2a16908172f516de139918d5d5a7d8e02d1c8eef69b887f`. `acknowledgeProviderSigner` and `getServiceMetadata` both succeeded via the unmodified SDK.
3. **That provider's HTTP endpoint (a Phala `dstack` confidential-VM host) failed at the TLS layer** — confirmed independently with a plain `curl`, not just the SDK: the connection is accepted but the server closes it before sending any response bytes. This is a network/host reachability issue with that specific provider, unrelated to Warrant, the SDK, or this investigation.
4. Switched to a second, independently-confirmed-reachable provider (`0xa48f01287233509FD694a22Bf840225062E67836`, `compute-network-6.integratenetwork.work`) — opened its sub-account (tx `0xae808c67a4e73a97aa284034bd72c2326b1322361263085b34fc474878dd0f7f`), acknowledged, got service metadata and request headers, and **completed a real HTTP round-trip to a genuine 0G Compute provider**.
5. The provider responded **HTTP 400** with a specific, well-formed JSON policy rejection: `"insufficient balance: your locked balance is 0.010000 0G, but the required minimum is 1.000000 0G"`. This is the provider's own server-side minimum-reserve policy — a business rule layered on top of everything documented so far, distinct from the contract's own `MIN_TRANSFER_AMOUNT`.

### Integration finding: the SDK's own minimums don't match the deployed contract

Independent of anything Warrant-specific, this run surfaced a real
discrepancy worth recording for anyone else integrating this SDK:

| Constant | SDK-side assumption | Live contract value (`eth_call`, confirmed M0/M3) |
|---|---|---|
| Minimum to open a ledger (`addLedger`) | 3 A0GI (client-side refusal below this) | `MIN_ACCOUNT_BALANCE` = 0.1 A0GI |
| Minimum to open a provider sub-account (inside `acknowledgeProviderSigner`) | 1 A0GI, hardcoded, with a source comment claiming it "matches contract MIN_TRANSFER_AMOUNT" | `MIN_TRANSFER_AMOUNT` = 0.01 A0GI |

Both SDK-side minimums are stricter than the contract actually requires —
not a security issue, but a real mismatch between the SDK's own comments
and the deployed contract's constants on this network, worth flagging to
0G independently of this project. This project's scripts call the contract
directly at its real minimum for exactly this reason, documented inline in
`track-b-reference/run.mjs`.

**Why this matters even though it didn't finish:** the provider evaluated
our balance and rejected us on *policy*, not on *authentication* — no 401,
no signature error. That is a real, additional, independent confirmation of
the M3.0 finding in the other direction: a genuine EOA session *does*
authenticate successfully against 0G Compute exactly as the source code
predicts. The only thing that stopped a complete settlement was money —
every remaining throwaway key combined (`~0.24 A0GI` in wallets, `~0.09
A0GI` still sitting unallocated in Track B's own ledger) falls well short
of the roughly `1+ A0GI` this specific provider requires reserved before it
will run a request.

**What was not reached:** an actual model response, a TEE-signed
settlement, a `BalanceUpdated`/`TEESettlementResult` event pair from a real
inference execution. Completing that needs roughly 1–1.5 A0GI more than is
currently available across every key this session controls.

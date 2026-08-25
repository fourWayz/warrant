# M6 — Mainnet production deployment

M6 deploys nothing new. It puts the already-audited M0–M5 `WarrantRegistry`
and `WarrantModule` — unchanged, unmodified, same bytecode logic — onto real
0G **mainnet** (chain ID 16661), reusing mainnet's own already-live Safe
v1.4.1 infrastructure and 0G Compute contracts rather than redeploying
anything, and independently verifies every claim against the chain itself
rather than trusting Foundry's own broadcast output.

No contract logic changed. No new feature was added. No authorization model
was touched.

## 1. Chain identification

Independently queried, not assumed from any config file or prior session:

| | Value | How verified |
|---|---|---|
| Chain ID | `16661` | `eth_chainId` via `cast chain-id --rpc-url https://evmrpc.0g.ai`, both before writing the deploy script and again during independent post-deployment verification |
| RPC endpoint | `https://evmrpc.0g.ai` | matches `foundry.toml`'s `og_mainnet` entry |

**LIVE / VERIFIED ON 0G.**

## 2. Dependencies reused, not redeployed

Per the constraint not to blindly redeploy infrastructure that already
exists, the following were located and confirmed live on mainnet via direct
`eth_getCode` calls before the deploy script was written — none of them
were deployed by this project:

| Contract | Address | Verification |
|---|---|---|
| Safe singleton (v1.4.1, `SafeL2`) | `0x29fcB43b46531BcA003ddC8FCB67FFE91900C762` | `eth_getCode` non-empty; canonical `safe-global/safe-deployments` address |
| Safe proxy factory | `0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67` | `eth_getCode` non-empty; canonical address |
| 0G `LedgerManager` | `0x2dE54c845Cd948B72D2e32e39586fe89607074E3` | `eth_getCode` non-empty; confirmed as the live mainnet ledger, distinct from the testnet address `0xE70830508dAc0A97e6c087c75f402f9Be669E406` recorded in `deployments/testnet.json` |
| 0G `InferenceServing` | `0x47340d900bdFec2BD393c626E12ea0656F938d84` | `eth_getCode` non-empty; `getAllServices()` returned a real registered provider used below |
| Allowed provider (`openai/gpt-oss-20b`) | `0x44ba5021daDa2eDc84b4f5FC170b85F7bC51ef64` | Returned by mainnet `InferenceServing.getAllServices()` — a real, currently-registered 0G Compute provider, not a placeholder |

**LIVE / VERIFIED ON 0G.** Unlike testnet — where no canonical presigned
Safe deployment transaction exists for Galileo's chain ID, forcing a
self-deployed Safe singleton/factory (`deployments/testnet.json`) — mainnet
already carries the canonical Safe infrastructure, so this deployment reuses
it directly.

## 3. Pre-deployment safety checks

Before any transaction was broadcast:

- Target chain confirmed as `16661` (mainnet), not `16602` (Galileo testnet).
- Deployer address `0x522bC0c3919fF823173ca4145feEcE905F772ffE` confirmed
  funded with real A0GI (~0.2 A0GI) via `cast balance`.
- 0G mainnet's own `LedgerManager.MIN_ACCOUNT_BALANCE` (3 A0GI) and
  `MIN_TRANSFER_AMOUNT` (1 A0GI) were read live and found to be an order of
  magnitude higher than testnet's (0.1 / 0.01 A0GI) — meaning the funded
  deployer balance is sufficient for contract deployment and wiring, but
  **not** sufficient for a real `transferFund` funding call. This is stated
  as a limitation in §9, not worked around.
- A full `forge script ... --rpc-url og_mainnet -vvvv` dry run (no
  `--broadcast`) was run against live mainnet state first, producing
  correctly-decoded calldata and deterministic addresses that matched the
  real deployment exactly. Only after that simulation matched expectations
  was `--broadcast` added.
- A dedicated deployer key was used, generated and funded for this purpose;
  the testnet throwaway keys were not reused. No private key appears in any
  committed file — confirmed by inspecting the diff below (§11) before
  committing.

## 4. Deployment transactions (real, mined, mainnet)

All 8 transactions below were broadcast in `contracts/script/DeployMainnet.s.sol`
and mined in a single block. Every hash and address in this table was
independently re-derived by reading
`contracts/broadcast/DeployMainnet.s.sol/16661/run-latest.json`'s own
`receipts` array (not the script's console output), then re-confirmed
against the live chain in §5.

| # | Action | Tx hash | Status |
|---|---|---|---|
| 1 | Deploy `WarrantRegistry` | `0x824e1f04451d6f0a46a4777c0f3c4b6ea620176df1d4d6193228e8961642ddc9` | `0x1` success |
| 2 | `SafeProxyFactory.createProxyWithNonce` (new Safe) | `0x1bba9fc82598b1cd661fba1019cbb14f1d3e0e178131db822e20c8625e9e2f60` | `0x1` success |
| 3 | Deploy `WarrantModule` | `0xd0955bef7f680679e238a1443533dbe76b0a50085f7fb062468062e2c4fddb04` | `0x1` success |
| 4 | Safe `execTransaction` → `enableModule(WarrantModule)` | `0xbd9aa6f842f34c85cbb1e4ec73e323f2b5c9c2c09f00510cd06f1ff435031370` | `0x1` success |
| 5 | Deploy `MockAgenticId` | `0xfaeb58def6112c8c704804bbc026726f409ab6bfc7e4bf5da44c13ac88b48338` | `0x1` success |
| 6 | `MockAgenticId.mint(owner, 1)` | `0xdb6a40f2c9ec84b5924189ae2f957325e588f091f25b34c43f3e4d3897362963` | `0x1` success |
| 7 | `WarrantRegistry.createWarrant(...)` → warrant #1 | `0x2f4371c4617df16294aa42b5f525ccd631ab8e09bea65fc02eccad82e54ad687` | `0x1` success |
| 8 | Safe `execTransaction` → `WarrantModule.setExecutor(executor, 1)` | `0x56aa98e270d9f3b6d7d0fa781c1a1e6c59e6e6d2d9566a1635a67745543ad8e0` | `0x1` success |

Block number: `42780048` (`0x28cc590`). Block timestamp: `1787833524`
(`2026-08-27T12:25:24Z`), read via `cast block 0x28cc590 --field timestamp`
against `https://evmrpc.0g.ai` directly — independent of the broadcast
artifact.

**LIVE MAINNET EVIDENCE.**

## 5. Independent post-deployment verification

Everything in this section was obtained by a fresh `cast` invocation against
`https://evmrpc.0g.ai` after the broadcast, deliberately not read from
Foundry's own script return values or console log:

```
chain id (independent RPC query):        16661

eth_getCode sizes:
  WarrantRegistry (0x6bb1c3def8eFa555F59435b2F1D728BC56d6132D): 7668 bytes
  SafeProxy      (0xdBC03a74dF7540bF4bEfA662765da0f2343CC0e7):   171 bytes
  WarrantModule  (0xd3bE7D80bF432B2B162cFbDc9B26404C9F909061):  1987 bytes
  MockAgenticId  (0xE7F4Ed4f0d5e882B13E5901ad72fc7ad978d64e6):  4102 bytes

WarrantModule wiring:
  safe():            0xdBC03a74dF7540bF4bEfA662765da0f2343CC0e7   (matches deployed Safe proxy)
  ledgerManager():   0x2dE54c845Cd948B72D2e32e39586fe89607074E3   (matches real mainnet LedgerManager — NOT the testnet address)
  registry():        0x6bb1c3def8eFa555F59435b2F1D728BC56d6132D   (matches deployed WarrantRegistry)
  executorWarrant(EXECUTOR): 1                                    (executor correctly bound to warrant #1)

Safe wiring:
  getOwners():            [0x522bC0c3919fF823173ca4145feEcE905F772ffE]
  getThreshold():         1
  isModuleEnabled(module): true
  nonce():                2   (2 execTransactions: enableModule, setExecutor)

MockAgenticId:
  ownerOf(1): 0x522bC0c3919fF823173ca4145feEcE905F772ffE

WarrantRegistry.getWarrant(1):
  (id=1, agenticIdContract=0xE7F4Ed4f0d5e882B13E5901ad72fc7ad978d64e6,
   tokenId=1, ownerAtCreation=0x522bC0c3919fF823173ca4145feEcE905F772ffE,
   boundModule=0xd3bE7D80bF432B2B162cFbDc9B26404C9F909061,
   maxTotalSpend=50000000000000000, spentAmount=0,
   startTime=1787833491, expiry=1788438291, active=true, version=1)

  isProviderAllowed(1, realProvider):  true
  isProviderAllowed(1, disallowed):    false
  remainingBudget(1):                  50000000000000000  (full budget, unspent)
  isStale(1):                          false

deployer balance remaining:            0.183270223970722892 A0GI
```

Every field above was cross-checked against the constructor arguments and
`createWarrant` parameters intended before broadcasting, with no
discrepancy. **The mainnet `WarrantModule` points to the real mainnet
`LedgerManager` (`0x2dE54c845Cd948B72D2e32e39586fe89607074E3`), confirmed
live, not the testnet address.**

**LIVE / VERIFIED ON 0G.**

## 6. Negative smoke tests (free — `cast call`, no transaction, no funds moved)

Three calls, each expected to revert, each run directly against mainnet
state via `eth_call`:

| Test | Call | Result |
|---|---|---|
| Non-executor attempts a transfer | `executeTransfer` from an address with no assigned warrant | Reverted `NotAuthorizedExecutor(0x...dEaD)` |
| Real executor targets a disallowed provider | `executeTransfer(disallowedProvider, ...)` from the real executor | Reverted `ProviderNotAllowed(warrantId=1, provider=0x...dEaD)` |
| Real executor exceeds the warrant's remaining budget | `executeTransfer(realProvider, ..., 60 A0GI)` from the real executor | Reverted `BudgetExceeded(warrantId=1, requested=60e18, remaining=5e16)` |

All three custom-error selectors and arguments were decoded and matched
against `IWarrantRegistry`'s and `WarrantModule`'s actual declared errors —
confirming the enforcement path (executor binding → provider allowlist →
budget cap) is live and correctly wired on mainnet, at zero cost.

**LIVE / VERIFIED ON 0G.**

## 7. What was deliberately not done, and why

No real `transferFund` / funding transaction was executed. Mainnet's own
`MIN_ACCOUNT_BALANCE` (3 A0GI) and `MIN_TRANSFER_AMOUNT` (1 A0GI) exceed the
funded deployer's balance (~0.2 A0GI before deployment, ~0.183 A0GI after).
Forcing that transaction would have required funding the wallet well beyond
what this milestone's verification needs, for a transaction whose outcome —
Warrant authorizing a real spend that 0G Compute's `LedgerManager` then
executes — is already proven end-to-end on testnet (see
`docs/m3-tracks.md`, Track A). Re-proving it on mainnet at real cost was
judged the wrong risk/reward trade for a milestone whose job is deployment
verification, not new proof.

`MockAgenticId` — the same test-only ERC-721 stand-in used throughout this
project, not a production Agentic-ID contract — was deployed to anchor
warrant #1 to a real token ownership check on mainnet. It carries no
security guarantee beyond "an address owns token 1"; see
`docs/threat-model.md` for what `WarrantRegistry` actually depends on from
its `agenticIdContract` parameter.

## 8. Claim boundaries (unchanged from prior milestones, restated for mainnet)

Warrant controls **authorization** of provider funding: it decides whether
a given executor may cause a given amount to be sent to a given provider
under a given warrant, atomically, on-chain. It does **not** control native
0G Compute **settlement** — `InferenceServing.settleFeesWithTEE` executes
independently of Warrant, using its own TEE-signed authentication path, and
Warrant cannot observe, gate, or reverse it. This deployment does not
change that boundary and makes no stronger claim than the one established
and adversarially tested in `docs/compute-compatibility-finding.md` and
`docs/bypass-analysis.md`.

## 9. Known limitations after M6

- No real mainnet `transferFund` has been executed; the funding path is
  proven live only on testnet (Track A) plus the isolated Track B
  reference flow.
- `MockAgenticId` is a test fixture, not a production identity contract —
  a real deployment would bind to a genuine Agentic-ID (or equivalent)
  contract instead.
- The deployer remains the sole Safe owner (threshold 1) — a production
  configuration would likely use a higher threshold and additional owners;
  this was an explicit, disclosed default for this milestone, not an
  oversight.
- Contract source has not been submitted to a public verifier/explorer for
  this mainnet deployment; bytecode was matched against the local Foundry
  build artifact instead (see `contracts/out/`), which is sufficient for
  the independent-verification bar this milestone set but is not the same
  as third-party explorer verification.

## 10. Evidence labels used in this document

Same discipline as every prior milestone doc (see `docs/m5-verifier.md`):
**LIVE / VERIFIED ON 0G** (read directly from mainnet via a fresh RPC call),
**LIVE MAINNET EVIDENCE** (a real, mined mainnet transaction or its
receipt), **TESTNET EVIDENCE** (anything sourced from Galileo, always
labeled as such, never presented as mainnet), **SYNTHETIC TEST FIXTURE**
(constructed, not observed), **FUTURE EXTENSION** (deliberately deferred).
Nothing in this document is testnet evidence presented as mainnet, and
nothing here is synthetic.

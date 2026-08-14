# Deployment records

One JSON file per network. Nothing in the contracts or scripts hardcodes an
address that belongs here — every script reads its addresses from these
files, and every new deployment writes back to them.

## Schema

```json
{
  "chainId": 16602,
  "name": "0g-testnet-galileo",
  "rpcUrl": "https://evmrpc-testnet.0g.ai",
  "og": {
    "ledgerManager": "0x...",
    "inferenceServing": "0x..."
  },
  "safe": {
    "singleton": "0x...",
    "proxyFactory": "0x...",
    "deployTx": "0x...",
    "deployedAt": "2026-08-26T00:00:00Z"
  },
  "warrant": {
    "registry": "0x...",
    "deployTx": "0x...",
    "deployedAt": null
  }
}
```

`og.*` addresses are recorded from `0glabs/0g-serving-contract`'s own
deployment artifacts (`deployments/zgTestnetV4/*.json` for testnet), verified
against the live chain via `eth_getCode` before being trusted here — not
copied from documentation, since 0G's own docs do not publish them.

`safe.*` and `warrant.*` are filled in by this repository's own deploy
scripts as each is actually deployed; a `null` value means "not yet
deployed on this network," not "unknown."

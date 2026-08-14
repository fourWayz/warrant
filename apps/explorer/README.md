# Warrant explorer (planned)

The public, read-only verifier: given an agent, a warrant id, or a transfer
or settlement tx hash, independently reconstructs what was authorized
against what 0G natively settled — reading on-chain state and logs
directly, trusting no backend of its own.

Not yet implemented. Depends on `WarrantRegistry`/`WarrantModule` being
deployed to a real network (see `deployments/`) and on the indexer in
`services/indexer`.

# @warrant/client (planned)

A viem-based TypeScript client for creating, updating, and querying warrants
against `WarrantRegistry`, and for calling `WarrantModule.executeTransfer`
as an agent executor.

Not yet implemented — this package is scaffolded ahead of a later milestone
so the workspace layout is stable. `contracts/` is the source of truth for
ABIs and addresses until this package exists; do not hand-write ABI copies
here when the time comes, generate them from `contracts/out/`.

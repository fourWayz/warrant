# Warrant indexer (planned)

Decodes `WarrantRegistry` and `WarrantModule` events, and cross-references
them against 0G's native `InferenceServing` settlement events, for the
explorer to consume. At demo scale this may not need to be a persistent
service at all — a stateless, per-query log fetch may be enough; build the
service only if that assumption turns out wrong.

Not yet implemented.

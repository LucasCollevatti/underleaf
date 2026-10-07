# fast-crc32c

This workspace vendors the small runtime portion of
`overleaf/node-fast-crc32c` at commit
`aae6b2a4c7a7a159395df9cc6c38dfde702d6f51`.

It is kept local so Yarn does not have to clone and pack the legacy Git
dependency during Underleaf image builds. Runtime behavior is preserved:
`@node-rs/crc32` is used when available, with the original JavaScript CRC32C
implementation as the fallback.

The vendored source remains under its original MIT license; see `LICENSE`.

# Security Policy

## Scope

This policy covers security issues in the `@meddleware/access-gate-ui` application/library source
(`src/**`) — the gate operator console, the `AccessGateView` library export, the hardcoded
commission constants, and the gate form components.

It does not cover:

- `@meddleware/nft-gate-client` or the `access-gate-sui` on-chain package (see their own policies)
- `@meddleware/wallet-adapter` or the wallet extension (which confirms every signature)

## Security model (invariants)

These invariants are load-bearing. A report demonstrating that any is violated is in scope and
treated as high severity:

1. **Commission constants are hardcoded and must fail closed.** `ACCESS_GATE_PACKAGE_ID` and
   `ACCESS_GATE_PLATFORM_CONFIG_ID` are compile-time per-network constants (deliberately not env
   vars) so purchases route commission on-chain; an empty/invalid constant for the active network
   must abort a purchase/gate action rather than build against an empty package id.
2. **No secret is a `VITE_*` value.** Only `VITE_NETWORK` + `VITE_RPC_*` are read; both are
   non-secret.
3. **Freeze is irreversible and guarded.** `make_gate_immutable` is behind a typed confirmation and
   cannot be triggered accidentally.
4. **No dynamic HTML sinks.** Gate `name`/`description` and any on-chain string render as text.
5. **On-chain truth.** All accounting, commission, and lifecycle live in the Move package, not JS.

## Supported versions

Only the latest published version receives security fixes.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities. Report by emailing
**<security@meddleware.co.uk>** with a description, reproduction/PoC if available, and the version or
commit SHA tested. You will receive an acknowledgement within **3 business days** and a resolution
plan within **14 days** for confirmed issues; Critical issues (CVSS ≥ 9.0) are prioritised for
same-day acknowledgement.

## Disclosure

Once a fix is released, a security advisory will be published on the GitHub repository. Reporters may
be credited by name unless they prefer to remain anonymous.

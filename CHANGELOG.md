# Changelog

All notable changes to `@meddleware/access-gate-ui` are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows
[Semantic Versioning](https://semver.org/). Before 0.2.0, breaking changes ship as patch releases.
Releases before 0.1.37 are recorded in the git history only.

## [0.1.37] - 2026-10-18

### Added

- The configured gate policy is validated with the client's `validateGatePolicy` when the view mounts. An
  invalid `VITE_GATE_*` combination (pause blocks decryption or access without freeze-requires-unpaused,
  `E_POLICY_COMBINATION`) shows a configuration error, disables Create and builds no transaction, instead of
  a create that aborts in the wallet (audit F12). `config.ts` exports `gatePolicyError` and `GATE_POLICY_ERROR`.
- Tests: `config.test.ts` (policy rule, abort messages for codes 15 and 16), `create-gate-form.test.ts`,
  `design-tokens-used.test.ts` (custom properties exist; `--warning` is never a text colour, F14) and
  `env-example.test.ts` (every `VITE_*` the code reads is in `.env.example` and the Dockerfile, F15).

### Changed

- Dependencies: `@meddleware/access-gate-client` ^0.0.9 (abort codes 15 and 16 in `abortMessage`),
  `@meddleware/design-tokens` ^0.1.10, `@mysten/sui` ^2.36.0, `@mysten/wallet-standard` ^0.21.34.
- Image base: static-server 0.1.8 (`sha256:e32cf42b…4000`).
- `npm-publish.yml` `verify` calls `node-ci.yml` (type-check, all linters, tests, build, licences), as the
  image release does (audit F19).
- `README.md` and `.env.example` document the policy dependency and list `VITE_NETWORK`.

### Fixed

- The warning badge on a gate card is drawn in `--warning-text` (4.86:1 on the light canvas), not the
  `--warning` fill (2.0:1) (audit F14).

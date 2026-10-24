# Changelog

All notable changes to `@meddleware/access-gate-ui` are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows
[Semantic Versioning](https://semver.org/). Before 0.2.0, breaking changes ship as patch releases.
Releases before 0.1.37 are recorded in the git history only.

## [0.1.40] - 2026-10-24

### Fixed

- The "Add unlockable content" link opens `sui-sealed-storage.meddleware.co.uk`; the old `sui-seal.` host was removed with the rename (ADR-0003).

## [0.1.39] - 2026-10-22

### Changed

- Image base: static-server 0.1.11 (Go 1.26.10 standard library, CVE-2026-111943, so the scan-before-sign gate passes)

## [0.1.38] - 2026-10-20

### Changed

- **Image build: native, no QEMU.** The build stage is `FROM --platform=$BUILDPLATFORM node:…-slim`: the
  output is architecture-independent static files, so the release no longer emulates arm64 and
  `docker-publish.yml` no longer has the `docker/setup-qemu-action` step (a privileged binfmt step). The
  runtime stage still starts from the multi-arch static-server image and only receives `COPY`.
  Proof (rootless podman): the 0.1.37 sources with only this Dockerfile change give a served tree (`/app/public`, the lockfile and `THIRD_PARTY_LICENSES`) with the same
  SHA-256 as the published 0.1.37 image (`sha256:712a7ee4…`), for every file of the amd64 image,
  and for every file the build stage produces in the arm64 image (the static-server binary comes from the base
  image, which rootless podman 4.9 resolves to the host architecture for the final stage; BuildKit does not).
  No file differs.
- Also ships what merged since 0.1.37: the Node 26 build baseline (`node:26-slim`, `@types/node`), the
  static-server 0.1.9 base image, and the dependency updates in `package-lock.json`.

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

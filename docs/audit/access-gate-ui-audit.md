# Security Audit — `access-gate-ui`

**Classification:** Internal security review
**Project:** `repos/access-gate-ui` — `@meddleware/access-gate-ui`, Vue 3 operator console for the access_gate NFT primitive (standalone SPA + `AccessGateView` library, embedded in the dashboard)
**Project type:** Vue app + UI library
**Template:** AUDIT_TEMPLATE.md (2026-10-08) + AUDIT_TEMPLATE_SUI_CLIENT.md (2026-10-08) + AUDIT_TEMPLATE_TS.md (2026-10-08) + AUDIT_TEMPLATE_VUE.md (2026-10-08) + AUDIT_TEMPLATE_IMG.md (2026-10-08)
**Sui SDK:** `@mysten/sui ^2.36.0` (installed 2.36.0, one copy per host; `npm ls` single version)   **Transport:** gRPC through wallet-adapter
**Networks:** testnet (live); mainnet shows "not deployed" until `access_gate` has a mainnet deployment; localnet likewise
**On-chain packages consumed:** `access_gate` through `@meddleware/access-gate-client/deployments` (0.0.9: testnet `0xd7ddaa94…88c9`, PlatformConfig `0x3f81489d…e7b5`; call targets `publishedAt`, types and events `originalId`; never configuration)
**Package manager / lockfile:** npm 11, committed (also copied into the image for SBOM tools)   **Module format / publish model:** ESM; ships source (library) + SPA image
**Runtime targets:** browser   **Peer dependencies:** `@meddleware/wallet-adapter >=0.0.12 <0.2.0`
**Build tool:** vite 8.3, `@vitejs/plugin-vue` 6.0.9, vue 3.5.43, vue-tsc 3.3.x, TypeScript 6.0.3, vitest 5.0.3
**Hosting:** container image on static-server (CSP and HSTS from the server); no static-host `_headers` file
**Embedding hosts:** the dashboard (`AccessGateView`, no shell chrome; dashboard requires `^0.1.35`)
**VITE_\* inventory:** `VITE_NETWORK` (testnet|mainnet, baked, selects the network only — never ids), `VITE_GATE_FREEZE_REQUIRES_UNPAUSED` / `VITE_GATE_LOCK_COMMISSION_ON_FREEZE` / `VITE_GATE_PAUSE_BLOCKS_DECRYPTION` / `VITE_GATE_PAUSE_BLOCKS_ACCESS` (gate policy, baked), `VITE_GATE_MIN_PRICE_MIST`, `VITE_GATE_ALLOW_FREE` (price rules, baked), `VITE_DOCS_URL` / `VITE_DEV_URL` (header links, baked); all public, none selects an on-chain id (F15: all listed in `.env.example`, pinned by `env-example.test.ts`)
**Images:** `quay.io/meddleware-org/access-gate-ui:0.1.37@sha256:712a7ee487f4ace04adb91233a72f3f29927e8ae84417eec7d4e886917876299` (Docker Hub mirror, same digest; cosign keyless signature verified 2026-10-18 against the workflow-anchored identity, `verify-digests.sh` 16/16; SPDX SBOM attestation, build provenance). Superseded 0.1.36 was `sha256:40219349…8b13`
**Base images:** build `node:24-slim@sha256:0e0ff40c…f9b6`; runtime `quay.io/meddleware-org/static-server:0.1.8@sha256:e32cf42b…4000`
**Runtime user:** `USER 65534:65534`   **Runtime FS:** read-only root, no writable mounts
**Deployed by:** `post-bootstrap/access-gate-ui/overlays/default`; digest from `config/images.yaml`
**Build args:** `VITE_NETWORK`, the four `VITE_GATE_*` policy flags, `VITE_GATE_MIN_PRICE_MIST`, `VITE_GATE_ALLOW_FREE` and `CSP` — none secret, none a test switch
**Deployment status:** npm v0.1.37 (2026-10-18); image `quay.io/meddleware-org/access-gate-ui` serving `sui-access-gate.meddleware.co.uk` at 0.1.37 (`sha256:712a7ee4…6299`; release tag `v0.1.37` = `1875326`; released, signature verified and deployed 2026-10-18, rollout succeeded; 0.1.36 `sha256:40219349…` was deployed 2026-10-09; live bundle carries only `access_gate` `0xd7ddaa94…` and PlatformConfig `0x3f81489d…`, checked 2026-10-18; live headers re-checked 2026-10-18); embedded in dashboard 0.1.85
**Review date:** 2026-09-18 (first pass) · re-verified 2026-10-03 · re-verified 2026-10-09 · fixes 2026-10-18 (0.1.37, released and deployed) · image build 2026-10-20 (0.1.38)
**Reviewer:** Internal review
**Severity ceiling:** Medium — the console signs AdminCap-gated gate transactions and pays commission and fees with the operator's wallet; it holds no keys and every rule is enforced on-chain.
**Status:** re-verified 2026-10-09; F12–F15 and F19 fixed in 0.1.37 (2026-10-18; released and deployed 2026-10-18, signature verified, rollout succeeded)

---

## Executive summary

A thin operator console. `AccessGateView` lists the gates the connected wallet administers and offers
create, settings, airdrop and freeze; every transaction and read comes from
`@meddleware/access-gate-client`, under the deployment it records. The app adds only form
validation, display conversions and the operator's gate-creation policy (`VITE_GATE_*`). There is no
`v-html` and no browser storage.

All first-pass findings are resolved or adjudicated. This pass found:

- **F9 (Low, RESOLVED 0.1.30 with access-gate-client 0.0.4)** — a truncated payment-recipient or
  airdrop address was zero-padded into a different, unowned address. The client now accepts only the
  full 64-hex form.
- **F10 (Low, RESOLVED 0.1.30)** — gate prices were shown, and pre-filled into the price editor,
  through a float: small prices appeared as `1e-7` (which the editor then refused) and very large
  ones were rounded. Both now use the exact MIST formatter.
- **F11 (Info, RESOLVED 0.1.29)** — an unpatched dev-tooling advisory blocked CI and the 0.1.28
  publish; the gate now accepts it through an expiring allowlist.

Re-verified 2026-10-09 (0.1.36; 27 unit tests, type-check and all three linters green, audit gate
1 allowlisted / 0 open; live site `sui-access-gate.meddleware.co.uk` read the same day):

- **F16 (Low, RESOLVED 0.1.32)** — the republished `access_gate` (`0xd7ddaa94…`, E15/E16, no
  `set_soulbound`) made two settings actions abort; the console no longer offers them.
- **F17 (Low, RESOLVED 0.1.35–0.1.36)** — the image release now runs the full CI workflow, scans the
  published image before cosign signs it, ships the lockfile for SBOM tools, serves
  `/THIRD_PARTY_LICENSES` (HTTP 200 live), runs as an explicit `USER 65534:65534` on static-server
  0.1.7, and the pod sets `automountServiceAccountToken: false`.
- The newly applicable lens checks found four defects, all **fixed in 0.1.37 (2026-10-18)**:
  **F12 (Low, RESOLVED)** the operator's `VITE_GATE_*` policy could be an invalid combination that
  aborted every create on-chain (`E_POLICY_COMBINATION`): the view now validates it with the client's
  `validateGatePolicy` and shows a configuration error; **F13 (Low, RESOLVED)** `node-ci.yml` did not run
  the unit tests (step added in `38b4d33`); **F14 (Low, RESOLVED)** `GateCard.vue` drew `--warning` as text
  (now `--warning-text`, pinned by a test); **F15 (Info, RESOLVED)** `VITE_NETWORK` is in `.env.example`.
- Accepted or maintainer items: **F18** blanket `connect-src https:`, **F19** the npm job's gate (RESOLVED 0.1.37: it calls `node-ci.yml`),
  **F20** the cosign identity pinned the repository, not the workflow (RESOLVED 2026-10-18: the workspace `verify-digests.sh` default is now workflow-anchored),
  **F21** registry mirror and credential inventory (DEFERRED, maintainer).

The severity ceiling stays Medium.

## Threat model / trust boundaries

| Actor | Holds / proves | Can do | Bounded by |
| --- | --- | --- | --- |
| Operator | wallet, AdminCaps | create, configure, airdrop, freeze own gates | own AdminCap; wallet confirmation; on-chain `access_gate` |
| Gate metadata author | `nftName`, `nftDescription`, `nftImageUrl` on-chain | supply arbitrary strings | text interpolation only; image URL never rendered here (F2) |
| Build configuration | `VITE_GATE_*` | restrict created gates, raise the price floor | public values; contract enforces its own minimum; ids not configurable (I1) |
| Full node | gates, caps, platform config | lie or omit | display only; fail-closed parsers (access-gate-client); the chain re-checks every call |
| Same-origin script | the shared wallet | drive transactions | no XSS sinks (I4); wallet confirmation; typed freeze confirmation (F3) |
| Static host / CDN | headers and served bytes | modify or strip them | digest-pinned image, CSP and HSTS from static-server (B.VUE-1); wallet confirmation |
| Whoever controls the build environment | every `VITE_*` value and the policy baked into created gates | create gates with a wrong policy or price floor | public values, no id or test switch (I1); F12 (invalid policy combination) |
| Embedding host (dashboard) | the page around `AccessGateView`, the shared wallet | switch account or network under the view | account/network watcher with load generation (I8); view injects no global CSS or chrome |
| Base-image publisher, registry, CI publish job | image layers, what is signed | ship altered bytes | digest pinning, Trivy before cosign, keyless signature, SBOM and provenance (B.2, F17) |

### On-chain dependency matrix

| Object / package | ID (original-id · published-at) | Sourced from | Used as | If stale, wrong or attacker-supplied | Fails open / closed |
| --- | --- | --- | --- | --- | --- |
| `access_gate` package, testnet | `0xd7ddaa94…88c9` · same (fresh publication 2026-10-09) | `deployments` export of access-gate-client 0.0.8 | call target (`publishedAt`); type and event filter (`originalId`) | calls old code or routes commission wrongly; a look-alike type is shown | closed: `accessGateDeployment` throws, the view shows "not deployed" |
| `PlatformConfig`, testnet | `0x3f81489d…e7b5` | same | argument of every create, price change and airdrop; read live for terms | wrong commission terms | closed (read failure aborts building) |
| `Gate`, `AdminCap`, `AccessNFT` types | defined at `originalId` | derived inside access-gate-client | owned-object and gate reads | look-alike objects listed | closed (exact-type parsers in the client) |
| mainnet, localnet | none recorded | — | — | — | closed (notice, no form) |

## Severity scale

Critical / High / Medium / Low / Info / Positive.

## Scope

- **In scope (0.1.36):** `src/**` (`config.ts`, `gates.ts`, `pricing.ts`, `validation.ts`,
  `wallet.ts`, `index.ts`, `main.ts`, `App.vue`, `components/*.vue`), `index.html`, `Dockerfile`,
  workflows, `.github/audit-gate.mjs`, `.github/dependabot.yml`, `scripts/third-party-licenses.mjs`,
  `SECURITY.md`; the manifests in `post-bootstrap/access-gate-ui/` (read-only).
- **Out of scope:** access-gate-client, access-gate-sui, wallet-adapter, ui (own audits).
- **Environment (2026-10-09):** `npm test` 27/27 (5 files, vitest 5.0.3); `vue-tsc`; stylelint, eslint,
  html-validate; production build; audit gate (1 allowlisted advisory, 0 open); `npm pack --dry-run`;
  live headers and bundle of `sui-access-gate.meddleware.co.uk`. The repository had no `CHANGELOG.md`
  (the `files` list names one; created in 0.1.37, history before it is in `git log`).

## Findings

### F1 — Empty mainnet ids

**Severity:** Medium (pre-mainnet gate)   **Disposition:** RESOLVED — first pass: format guard and an
init diagnostic. Superseded in B2/B3: the ids now come from `@meddleware/access-gate-client/deployments`
(`accessGateDeployment` throws for a network without a deployment), `deployed` is computed from it,
and the whole console renders a "not deployed" notice instead of mounting any form. The app-local
`constants.ts` no longer exists.
**Remediation / evidence (2026-10-09):** `33fdf2d`. The recorded testnet deployment is now the
republished `access_gate` `0xd7ddaa94…88c9` / PlatformConfig `0x3f81489d…e7b5` (access-gate-client 0.0.8);
mainnet and localnet still have none. The live bundle was read 2026-10-09 and contains exactly those
two ids (no superseded `0xa55789…`). Tests: `tests/gates.test.ts` (ids at the latest package; refusal
without a deployment).

### F2 — No XSS sinks

**Severity:** Positive — no `v-html`, `innerHTML` or `eval`; gate metadata renders through text
interpolation or as `<input>` values. `nftImageUrl` is never bound to `src` or `href` here.
Re-checked 2026-10-09 (`grep` over `src/`): still none; the only dynamic `:href` is the seal link (F7).

### F3 — Freeze confirmation

**Severity:** Low   **Disposition:** ADJUDICATED — two steps, the typed word `FREEZE` checked by
both the button state and `freeze()`, irreversibility (and the commission lock, when the policy sets
it) explained; a policy that forbids freezing while paused shows why instead of offering an aborting
transaction. Tested (`freeze-gate-button.test.ts`).

### F4 — Public configuration only; local env files

**Severity:** Low   **Disposition:** RESOLVED (0.1.30, `c75790e`) — every `VITE_*` value is public (network,
docs links, gate policy, price floor, free-gate switch). `.gitignore` now ignores `.env` and `.env.*`
except `.env.example`, as `.env.example` instructs. Re-verified 2026-10-09: the claim that every
variable is listed in `.env.example` was too strong — `VITE_NETWORK` was missing (F15, fixed 0.1.37; the
claim is now pinned by `tests/env-example.test.ts`).

### F5 — `npm ci` and dependency audit

**Severity:** Low   **Disposition:** RESOLVED — `npm ci` in the image and every workflow; the audit
gate runs in CI (`node-ci.yml`, which the image release now calls, F17) and the npm publish workflow
(see F11). Re-verified 2026-10-09: `node .github/audit-gate.mjs` reports 1 high/critical advisory,
0 not allowlisted.

### F6 — `SECURITY.md`

**Severity:** Low   **Disposition:** RESOLVED — present; the on-chain-truth boundary is confirmed:
prices, commission and fees are read from `PlatformConfig` and enforced by the contract. Re-read
2026-10-09: its five invariants match the code and this audit (the deployment binding, no secret
`VITE_*`, guarded freeze, no HTML sinks, on-chain truth); supported versions: latest only.

### F7 — Seal link built from chain data

**Severity:** Low   **Disposition:** RESOLVED (0.1.25) — `GateCard` encodes the gate id into the
query and binds the result through `safeHref`. Tested (`gate-card.test.ts`).

### F8 — NFT image URL scheme

**Severity:** Low   **Disposition:** RESOLVED (B3) — `imageUrlError` accepts empty, `https:` or a
`data:image/…` URI of at most 2048 characters, on create and on update, before anything is signed.
Tested (`validation.test.ts`).

### F9 — Truncated recipient address accepted

**Severity:** Low   **Disposition:** RESOLVED (0.1.30; access-gate-client 0.0.4 F14)
**Where:** create form (`paymentRecipient`), settings (`set_payment_recipient`), airdrop recipient
**Issue / impact:** `tx.pure.address` zero-pads short hex, so a truncated paste such as `0x12ab` was
signed as `0x000…12ab`. Purchase revenue or an airdropped pass (and its commission) would go to an
address nobody controls; the wallet shows the padded value, which is easy to miss.
**Remediation / evidence:** the client's builders accept only `0x` followed by 64 hex digits
(`toAddress`), so the console shows the error before the wallet opens; tested in the client.

### F10 — Prices shown and pre-filled through a float

**Severity:** Low   **Disposition:** RESOLVED (0.1.30)
**Where:** `GateCard.vue` (`priceLabel`), `GateSettingsPanel.vue` (price seed)
**Issue / impact:** `Number(mist) / 1e9` printed 100 MIST as `1e-7 SUI` and rounded prices above
2^53 MIST. The settings editor was seeded with the same string, so pressing *Update* unchanged on such
a gate failed with "Invalid price", and a rounded seed could change a large price.
**Remediation / evidence:** both use `mistToSui` (exact bigint arithmetic). `gate-card.test.ts`
covers 0, 100 MIST and 9 007 199 254 740 993 MIST.

### F11 — Unpatched dev-tooling advisory blocked releases

**Severity:** Info   **Disposition:** RESOLVED (0.1.29)
**Where:** workflows
**Issue / impact:** GHSA-vfj7-8cjw-p6xm (braces, no patched release) failed
`npm audit --audit-level=high`, so CI and the 0.1.28 publish failed. It is reached only through
stylelint and the ESLint TypeScript config; `npm audit --omit=dev` is clean.
**Remediation / evidence:** `.github/audit-gate.mjs` fails on any high or critical advisory not
listed in `.github/audit-allowlist.json`; entries need a reason and expire (this one 2027-01-01).
Grounding log, *Audit gate allowlist*; TS lens B.TS-3. Re-run 2026-10-09: 1 allowlisted, 0 open; the
gate runs in `node-ci.yml` (and so in the image release, F17) and in `npm-publish.yml`.

### F12 — The operator's gate policy can be an invalid combination that aborts every create

**Severity:** Low   **Disposition:** RESOLVED (0.1.37, commit `7797228`; access-gate-client 0.0.9)
**Where:** `src/config.ts` (`GATE_POLICY` from `VITE_GATE_*`), `src/components/CreateGateForm.vue:78`; the
republished `access_gate::new_gate_policy`
**Issue:** the contract (`0xd7ddaa94…`) rejects a policy whose pause blocks decryption or access unless
freezing also requires the gate to be unpaused (`E_POLICY_COMBINATION = 15`). The app builds
`GATE_POLICY` from four independent build flags and never checks the combination, and
`ACCESS_GATE_ABORTS` in access-gate-client 0.0.8 ends at code 14 (client audit F24), so a failed create
shows the raw abort text, not a meaning.
**Impact:** an operator who builds the image with `VITE_GATE_PAUSE_BLOCKS_ACCESS=true` and without
`VITE_GATE_FREEZE_REQUIRES_UNPAUSED=true` ships a console in which every create fails on-chain (the
wallet's dry run normally shows it before signing). The defaults and the live deployment (all false) are
unaffected; no funds or invariants are at risk.
**Remediation / evidence:** the check lives in the domain client (ADR-0001): access-gate-client 0.0.9
exports `validateGatePolicy` and `buildCreateGateTx` throws for the combination; its abort table covers
codes 15 and 16 (client F24). This app, 0.1.37: `config.ts` `gatePolicyError` / `GATE_POLICY_ERROR`
validates the configured `GATE_POLICY` at load; `AccessGateView` shows it as an error notice on mount,
`CreateGateForm` disables Create and refuses to build or sign. The README flag table and `.env.example`
state the dependency. Pinned by `tests/config.test.ts` (rule, defaults, abort messages 15 and 16 through
`abortMessage`) and `tests/create-gate-form.test.ts` (disabled button, nothing built or executed).

### F13 — Unit tests are not run by CI or by the release gate

**Severity:** Low   **Disposition:** RESOLVED (`38b4d33`, verified 0.1.37)
**Where:** `.github/workflows/node-ci.yml` (no `npm test` step); `docker-publish.yml` `verify` calls it
**Issue:** CI runs the audit gate, type-check, the three linters, the build and the licence check, but not
the 27 unit tests. Only the npm job's `verify` runs `npm test`. The image release's own `verify` job did
run `npm test` until 0.1.36 (`d617171`), which replaced it with a call to `node-ci.yml` (F17) and so
dropped the tests from the image gate; the comment in `docker-publish.yml` ("type-check, lint, tests,
build, licences") is wrong. TS lens: every test project that exists runs in CI.
**Impact:** a regression in the pricing, image-URL, freeze or `executeTx` logic could merge and be
released as an image without any gate failing; the npm job would still catch it for the library.
**Remediation / evidence:** add `- run: npm test` to `node-ci.yml` (as the sibling apps walrus-ui,
token-deployer-ui and ui do); verified by reading both workflows 2026-10-09 and running the suite locally
(27/27 pass, so adding the step turns nothing red).
**Resolution:** `node-ci.yml` has an `npm test` step (`38b4d33`); `docker-publish.yml` and, since 0.1.37,
`npm-publish.yml` call that workflow, so a tag runs the 49 tests (9 files) in both gates.

### F14 — `--warning` drawn as text on the light canvas

**Severity:** Low   **Disposition:** RESOLVED (0.1.37, commit `7797228`)
**Where:** `src/components/GateCard.vue:112` (`.badge--warn { color: var(--warning); border-color: currentColor }`)
**Issue:** `--warning` is the bright yellow fill (`#e0a500`, 2.0:1 on the light canvas). The warning badge
on a gate card (paused or similar caution) is text on the light theme. design-tokens 0.1.9 (the
installed version) provides `--warning-text` for this role (4.86:1 light, yellow-300 dark); ui and
wallet-adapter already use it (design-tokens audit F2, F10).
**Impact:** the badge is hard to read for low-vision users in the light theme (VUE lens *Colour & links*,
WCAG AA 4.5:1). Information is also in the badge text, nothing is hidden.
**Remediation / evidence:** `.badge--warn` uses `var(--warning-text)` (design-tokens 0.1.10). Pinned by
`tests/design-tokens-used.test.ts`: every custom property the components read is defined by design-tokens
(or by the component), and no component sets `color: var(--warning)`; the test fails on the old line.
Not browser-checked per theme and season for this app's own components: the ui gallery axe gate covers the
shared components only.

### F15 — `VITE_NETWORK` is missing from `.env.example`

**Severity:** Info   **Disposition:** RESOLVED (0.1.37, commit `7797228`)
**Where:** `.env.example` (lists `VITE_DOCS_URL`, `VITE_DEV_URL`, the four `VITE_GATE_*` flags,
`VITE_GATE_MIN_PRICE_MIST`, `VITE_GATE_ALLOW_FREE`); `src/main.ts:13` reads `VITE_NETWORK`
**Issue:** the VUE lens requires every variable the code reads to appear in `.env.example`. `VITE_NETWORK`
is documented in `README.md` and the Dockerfile (default `testnet`) but not in `.env.example`.
**Impact:** documentation only; the default is correct and the value only selects testnet or mainnet,
never an id.
**Remediation / evidence:** `.env.example` lists `VITE_NETWORK`. Re-checked the claim that every `VITE_*`
variable is listed: the code reads nine names and all are in `.env.example`; `tests/env-example.test.ts`
now fails if the code reads a name that `.env.example` lacks, or that is not a Dockerfile build arg (the
two docs links excepted).

### F16 — Settings offered actions the republished contract rejects

**Severity:** Low   **Disposition:** RESOLVED (0.1.32, `92f5942`; access-gate-client 0.0.8)
**Where:** `src/components/GateSettingsPanel.vue`, `src/gates.ts`
**Issue:** the 2026-10-09 `access_gate` has no `set_soulbound` (the pass kind is fixed at creation) and
`set_default_uses` cannot cross zero (`E_USES_KIND_IMMUTABLE = 16`). The console still offered the
soulbound toggle and a default-credits editor for every gate.
**Impact:** an operator could sign transactions that abort, or believe the pass kind of a gate could be
changed later.
**Remediation / evidence:** the toggle is removed; the default-credits editor shows only for gates whose
`defaultUses` is above zero (`min="1"`); the create form still chooses soulbound once, at creation. The
client's `buildSetSoulboundTx` is gone (0.0.8). Decision: GatePolicy and pass kind are immutable. No unit
test pins the settings panel (see C.1).

### F17 — Image release gate, scan, notices and runtime user

**Severity:** Low   **Disposition:** RESOLVED (0.1.35 `834c7c3`, 0.1.36 `d617171`)
**Where:** `.github/workflows/docker-publish.yml`, `Dockerfile`, `scripts/third-party-licenses.mjs`, `post-bootstrap/access-gate-ui/base/deployment.yaml`
**Issue:** the image release was gated by a subset of CI (audit, type-check, unit tests), the published
image was not scanned before signing, the lockfile was not in the image (the SBOM saw only the base), no third-party licence
texts were served with the bundled npm code, and the runtime user was only inherited from the base.
**Impact:** a tag could ship what CI would have refused; an SBOM that misses the bundled dependencies;
redistributed MIT/Apache code without its notices.
**Remediation / evidence:** `verify` calls `node-ci.yml` (`workflow_call`) and both build jobs `need` it
(including the unit tests, F13); the public job runs Trivy on the pushed digest (CRITICAL/HIGH, fixable only,
`exit-code: 1`) before `cosign sign`, then an SPDX SBOM attestation and build provenance for quay.io and
Docker Hub, with no `continue-on-error`; the Dockerfile runs `npm run licenses` in the build stage and
copies `package-lock.json` to `/usr/share/doc/access-gate-ui/`; `/THIRD_PARTY_LICENSES` returns HTTP 200
on the live site (2026-10-09) and CI runs `check:licenses`; the runtime base is static-server 0.1.7 at the 2026-10-09 review (0.1.8 since 0.1.37)
(Go 1.26.9) with an explicit `USER 65534:65534`; the pod sets `automountServiceAccountToken: false`,
`runAsNonRoot` uid 65534, read-only root, all capabilities dropped, `RuntimeDefault` seccomp, probes and
limits; the digest is identical in `config/images.yaml` and the overlay; all images cosign-verified
2026-10-09 (`verify-digests.sh`, 16/16). Not run: a Trivy *config* scan of the Dockerfile and manifests
(the image scan runs at release).

### F18 — `connect-src` allows any https origin

**Severity:** Info   **Disposition:** ACCEPTED-RISK
**Where:** `Dockerfile` (`CSP` argument); live header read 2026-10-09
**Issue:** `connect-src 'self' https:` and `img-src 'self' data: blob: https:` are blanket allowances.
**Impact:** an injected script could send data to any https host. Script injection is the prerequisite,
and `script-src 'self' 'nonce-…'` with no inline script and no XSS sink (I4) is the control on that.
**Remediation / evidence:** accepted: the RPC node, relays and aggregators are operator- or
user-configured per network, and gate images are arbitrary https URLs from chain data (the policy for
those is F8: https or `data:image/`). Enumerating hosts would break white-label builds. Revisit when
the hosts are fixed for mainnet.

### F19 — The npm publish gate is a subset of CI

**Severity:** Low   **Disposition:** RESOLVED (0.1.37, commit `7797228`)
**Where:** `.github/workflows/npm-publish.yml`
**Issue:** the npm job's `verify` runs `npm ci`, the audit gate, type-check and the unit tests, not the
full CI workflow (linters, licence check). The image release (F17) does run the full workflow on the
same tag.
**Impact:** a tag could publish the source package while the image job refuses the same commit. The
package is source only (`npm pack --dry-run` 2026-10-09: `src`, `index.html`, `vite.config.ts`,
`tsconfig.json`, README, LICENSE; no tests, fixtures or `.env*`).
**Remediation / evidence:** `npm-publish.yml` `verify` now calls `node-ci.yml` (`uses:
./.github/workflows/node-ci.yml`), as `docker-publish.yml` does and as walrus-ui 0.1.58 did, so a tag
publishes the source package only if the full CI set passes. The package stays source only, OIDC-published
with provenance, tag == version checked, idempotent, and gated on `NPM_PUBLISH`.

### F20 — The cosign identity pins the repository, not the workflow

**Severity:** Info   **Disposition:** RESOLVED (2026-10-18, workspace `verify-digests.sh` default; was ACCEPTED-RISK)
**Where:** `bootstrap/images/verify-digests.sh` (workspace); this repository publishes no verify command
**Issue:** the cluster check accepted any workflow identity of `github.com/meddleware-org/access-gate-ui`.
**Impact:** a workflow added by someone with write access could have signed an image the check would accept.
**Remediation / evidence:** fixed in the workspace script on 2026-10-18: the default identity in
`bootstrap/images/verify-digests.sh` is now `^https://github\.com/meddleware-org/${name}/\.github/workflows/docker-publish\.yml@refs/tags/v`
(`COSIGN_IDENTITY_REGEXP` still overrides it), so a signature from any other workflow or ref of the repository is
rejected. All 16 deployed and contingency images verified valid against it on 2026-10-18
(`STRICT=0 bash bootstrap/images/verify-digests.sh`, 0.1.37 included); 2026-10-09 (0.1.36) was
checked with the earlier repository-wide identity. This repository publishes no verify command, so the script
default was the only remaining problem.

### F21 — Self-hosted registry mirror and registry credentials

**Severity:** Info   **Disposition:** DEFERRED (maintainer; `OPERATOR_TASKS.md` "Image registry credentials — record scope and rotation")
**Where:** `docker-publish.yml` `mirror-private` (`continue-on-error: true`); `QUAY_TOKEN`, `DOCKERHUB_TOKEN`
**Issue:** the `mirror-private` job (a digest-preserving copy of the published, signed image, not a rebuild) fails without registry credentials; the quay.io and Docker Hub
tokens are long-lived and not yet inventoried.
**Impact:** the mirror may lag; a leaked token could push an unsigned tag (the cluster pins digests and
verifies signatures, so it would not run).
**Remediation / evidence:** the mirror is listed as best-effort; the public job has no `continue-on-error`.
The credential inventory (scope, holder, expiry, rotation) is the maintainer item.

## Section A — Invariant verification matrix

| # | Invariant | Enforced at | Proven by | Status |
| --- | --- | --- | --- | --- |
| I1 | access_gate ids come only from the recorded deployment | `config.ts` `requireDeployment`; no `VITE_*` id | source; client `check:deployments`; live bundle read 2026-10-09 (only `0xd7ddaa94…`, `0x3f81489d…`) | HOLDS |
| I2 | No deployment ⇒ no form and no call | `deployed` gate in `AccessGateView` | `tests/gates.test.ts` (refusal without a deployment) | HOLDS (F1) |
| I3 | No on-chain logic in the app | builders and reads from access-gate-client | source; `suiBoundary` lint (eslint-config 0.0.2), lint clean 2026-10-09 | HOLDS |
| I4 | Chain data rendered as text; dynamic URLs through helpers | no `v-html`; `safeHref` | `gate-card.test.ts` | HOLDS (F2, F7) |
| I5 | Freeze needs the typed word | `FreezeGateButton` | `freeze-gate-button.test.ts` | HOLDS (F3) |
| I6 | Values signed are exact | `suiToMist` / `mistToSui`; `toU64`, `toAddress` in the client | `pricing.test.ts`, `gate-card.test.ts`, client tests | HOLDS (F9, F10) |
| I7 | Live terms read before every paid action | `getPlatformConfig()` at submit, airdrop and make-free | source | HOLDS (code-only) |
| I8 | A slower gate load never overwrites a newer one | load generation counter; cleared on account or network change | source | HOLDS (code-only) |
| I9 | Only actions the deployed contract accepts are offered | settings panel (no soulbound toggle; default credits only for single-use gates) | source; client 0.0.8 has no `buildSetSoulboundTx` | HOLDS (code-only) — F16; no component test |
| I10 | A gate policy built from configuration is valid on-chain | `config.ts` `gatePolicyError` (client `validateGatePolicy`); `AccessGateView` notice; `CreateGateForm` guard; `buildCreateGateTx` throws | `config.test.ts`, `create-gate-form.test.ts` | HOLDS (F12) |
| I11 | The unit tests run on every change and every release | `node-ci.yml` `npm test`, called by both release workflows | workflows | HOLDS (F13) |

### Lens categories

| Lens | Category | Status |
| --- | --- | --- |
| SUI_CLIENT | ABI mirroring | through access-gate-client (builder tests and the weekly ABI-drift suite there); the app calls no `moveCall` |
| SUI_CLIENT | Package-ID split | HOLDS — `publishedAt` for calls, `originalId` for reads and abort decoding |
| SUI_CLIENT | Network / chain binding | HOLDS — wallet-adapter's shared selector selects ids, client and wallet chain; the standalone build sets `VITE_NETWORK` once (testnet or mainnet only); the chain-id check is wallet-adapter 0.0.17's (own audit) |
| SUI_CLIENT | Value encoding | HOLDS — bigint prices (F10); full 64-hex recipient addresses only (F9); gate ids shown as `0x12345678…abcd` (8 + 4 characters) as a label, not for money-moving confirmation |
| SUI_CLIENT | Funds in the PTB | through access-gate-client (exact splits, commission and fee routed from `PlatformConfig`); the app shows the amounts first |
| SUI_CLIENT | Capabilities & irreversible ops | HOLDS — AdminCaps by id; freeze behind the typed word (F3) |
| SUI_CLIENT | Abort mapping | HOLDS for codes 1–16 — `errorMessage` decodes access_gate aborts against `originalId` (client 0.0.9 maps 15 and 16; `config.test.ts`) |
| SUI_CLIENT | Execution result | HOLDS — failed effects throw with the abort; an unconfirmed wait says so and asks to refresh (`gates.test.ts`) |
| SUI_CLIENT | Read parsing, events, signature verification, dry-run, client-side publish | N/A — reads are access-gate-client's (exact types, fail-closed parsers); the app verifies no signature, reads no events and publishes no code |
| SUI_CLIENT | Chain-access layering | HOLDS — `suiBoundary` forbids PTB and read logic outside `src/wallet.ts`; type-only SDK imports |
| TS | Compiler strictness | HOLDS — `strict: true`, `vue-tsc --noEmit` in CI; `noUncheckedIndexedAccess` is not enabled (the app parses no untrusted data itself); `skipLibCheck: true` hides nothing in `src/` |
| TS | Assertions, validation, money, promises, network I/O, encoding, dynamic code | HOLDS — no `any`, `!`, `eval` or `fetch` in `src/`; the only casts are the build-time `import.meta.env` read (`config.ts`, `main.ts`); amounts are `bigint`; the app has no network call of its own |
| TS | Caller-keyed lookups | HOLDS — `accessGateDeployment` uses `Object.hasOwn` (client) |
| TS | Strictness, exports, `files`, supply chain | HOLDS — `files` whitelist (`npm pack --dry-run` clean); `npm ci`; audit gate (F11); the unit tests run in CI and both release gates (F13) |
| VUE | Untrusted rendering | HOLDS (I4) |
| VUE | Colour & links | HOLDS — `--warning-text` for the badge, pinned by `design-tokens-used.test.ts` (F14); the seal link is a stand-alone action link, not running text |
| VUE | Build-time configuration | HOLDS (F4, F15) — every `VITE_*` in `.env.example`, pinned by `env-example.test.ts` |
| VUE | Test hooks | N/A — none; no test mode exists |
| VUE | Signing UX | HOLDS — minimum price, free-gate fee and airdrop commission shown before signing; permanent policy rules listed; freeze explained; the network is named in the intro; buttons disabled while a request is in flight (`busy`/`submitting`) |
| VUE | Shared-wallet state | HOLDS (I8); account and network changes clear and reload the list; wallet-standard change events are wallet-adapter's |
| VUE | Browser storage | N/A — none used by the app |
| VUE | Lazy boundaries | N/A — no heavy SDK or wasm |
| VUE | Dual app / library | HOLDS — `AccessGateView` has no shell chrome and injects no global CSS |
| VUE | Estimates | HOLDS — prices and commission come from `PlatformConfig`; the console only formats them |
| IMG | Base images, build context, reproducible build, no secrets, runtime user, scan, SBOM and notices | HOLDS (F17) — digest-pinned `node:24-slim` and static-server 0.1.8; `.dockerignore` excludes `node_modules`, `dist`, `.git`, `.github`, `.env*.local`; `npm ci`; no secret in any `ARG`/`ENV`; Trivy before cosign; lockfile in the image; `/THIRD_PARTY_LICENSES` served |
| IMG | Build host and emulation | HOLDS (0.1.38) — the build stage is `FROM --platform=$BUILDPLATFORM` (its output is architecture-independent static files) and the runtime stage only `COPY`s into the multi-arch static-server image; `docker-publish.yml` has no `docker/setup-qemu-action` step, so no privileged binfmt step runs in the release; rootless podman build with the 0.1.37 sources: the served tree, lockfile and `THIRD_PARTY_LICENSES` hash identically to the published 0.1.37 image |
| IMG | Verification command | HOLDS — this repository publishes no command; the cluster check pins `docker-publish.yml@refs/tags/v` (F20, RESOLVED 2026-10-18) |
| IMG | Deployment pinning | HOLDS — digest in `config/images.yaml` and the overlay; the base manifest's tag label (`0.1.3`) is overridden by the overlay digest and is cosmetic |

## Section B — Supply-chain, publish-authority & capability matrix

### B.1 Dependency & CVE risk

| Dependency | Pinned version | Liveness dependency? | CVE / audit status | Notes |
| --- | --- | --- | --- | --- |
| `@meddleware/access-gate-client` | `^0.0.9` (installed 0.0.9) | every action | clean 2026-10-18 | latest; abort table covers 1–16 (F12) |
| `@meddleware/wallet-adapter` | peer `>=0.0.12 <0.2.0`; dev `^0.0.17` | wallet | own audit | host's copy |
| `@meddleware/ui` / `design-tokens` / `eslint-config` | `^0.1.31` / `^0.1.10` / `^0.0.2` | UI | own audits | latest published |
| `@mysten/sui` | `^2.36.0` (installed 2.36.0) | reads, transactions (type imports only here) | `npm audit` gate 2026-10-09: only F11 | one copy (`npm ls`); ADR-0001 baseline `^2.33.1` |
| `@mysten/wallet-standard` | `^0.21.0` | none | clean | declared as a dependency but imported nowhere in `src/` or `tests/` (suggestion) |
| Vue / Vite / TypeScript / vitest | 3.5.43 / 8.3 / 6.0.3 / 5.0.3 (plugin-vue 6.0.9, vue-tsc 3.3.x) | build | clean | TypeScript 7 and vitest 5-major follow-ups declined (decision); Node 24 LTS |
| Sui full node | public gRPC (wallet-adapter) | listing and reading terms | Mysten | fails closed |
| `static-server` / `node:24-slim` | 0.1.8 / digest-pinned | runtime / build | Trivy at release (F17); Go 1.26.9 | — |
| dev tooling | lockfile | no | GHSA-vfj7-8cjw-p6xm allowlisted to 2027-01-01 | F11 |

Shared-dependency matrix (TS lens): `@mysten/sui` dep `^2.33.2` (baseline `^2.33.1`, within range);
`vue` dep `^3.5.43`; `typescript` dev `~6.0.0`; `vitest` dev `~5.0.2`; `@mysten/wallet-standard` dep
`^0.21.0`; `@mysten/walrus`, `@mysten/walrus-wasm`, `@mysten/seal`, `@mysten/bcs`: not used. First-party
ranges are `^0.0.x` (exact) or `^0.1.x` (ui, which resolves to the latest published); no `~0.0.x`; the
peer range for wallet-adapter is `>=0.0.12 <0.2.0`, no `legacy-peer-deps`.

Install-time code (TS B.TS-2): the lockfile has one lifecycle script, `fsevents` 2.3.3 (dev, optional,
macOS only); no `allowScripts`, no `overrides`; no `prepare`/`postinstall` in `package.json`. `files`:
`src`, `index.html`, `vite.config.ts`, `tsconfig.json` and `CHANGELOG.md` (created 0.1.37; `files` had named a file that did not exist).

### B.2 Publish authority, capabilities & secret custody

| Authority / secret | Where held | Custody | Gates | Rotation |
| --- | --- | --- | --- | --- |
| npm publish | GitHub Actions | OIDC + provenance; opt-in `NPM_PUBLISH` | library | n/a |
| `QUAY_TOKEN`, `DOCKERHUB_TOKEN` | GitHub secrets | long-lived robot accounts (inventory: `OPERATOR_TASKS.md`) | image push | F21 |
| image signing | GitHub Actions | cosign keyless | images | n/a |

Operators' AdminCaps stay in their own wallets; the app never holds or moves one except by the
operator-signed freeze, which consumes it.

CI & release integrity: actions pinned by SHA (workflows read 2026-10-09); explicit `permissions:` per
workflow and job (`id-token`/`attestations` only on the signing job, `id-token` only on the npm publish
job); OIDC publish with a tag == version check and an idempotent registry check; npm client pinned
(`npm@11.20.0`); image release = full CI via `workflow_call` + Trivy + cosign + SPDX SBOM attestation +
provenance, no `continue-on-error` on the public path (F17; the CI workflow runs the tests, F13; the npm
gate calls the same workflow, F19); `npm ci` everywhere; audit gate in CI, and so in both release jobs (F11); Dependabot weekly
and grouped for npm, Docker and Actions (`.github/dependabot.yml`); no test-only build mode exists, so
there is nothing to scan for; no job spends real funds.

### B.VUE-1 Hosting headers

Live headers on `sui-access-gate.meddleware.co.uk`, read 2026-10-09: `Content-Security-Policy`
(`default-src 'self'`, `script-src 'self' 'nonce-…'`, `style-src 'self' 'unsafe-inline'`, `connect-src
'self' https:`, `img-src 'self' data: blob: https:`, `object-src 'none'`, `base-uri 'self'`,
`form-action 'self'`, `frame-ancestors 'self'`, `upgrade-insecure-requests`),
`Strict-Transport-Security` (1 year, includeSubDomains), `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `X-Frame-Options: SAMEORIGIN`.
The CSP is static-server's (`CONTENT_SECURITY_POLICY` from the `CSP` build argument); there is no static
host and no `_headers` file. `'unsafe-inline'` is for styles only; the build emits no inline script. The
blanket `https:` in `connect-src` and `img-src` is F18. Framing is `'self'` only; the dashboard embeds the
view as a component, not a frame.

### B.VUE-2 Build inputs and artifacts / IMG

`node:24-slim@sha256:0e0ff40c…` builder and `static-server:0.1.8@sha256:e32cf42b…4000` runtime (0.1.36 carried 0.1.7), both
digest-pinned (Dependabot Docker group); `npm ci`; `.dockerignore` excludes local installs, build output,
VCS data and every `.env*.local`; `npm run build && npm run licenses` run in the build stage; the runtime
stage copies `dist` and the lockfile only; `USER 65534:65534`; no secret in any `ARG`/`ENV` (the build
args are the public `VITE_*` values and the CSP); production sourcemaps are not emitted (Vite default); the
deployment is read-only root, `runAsNonRoot` uid 65534, no privilege escalation, all capabilities dropped,
`RuntimeDefault` seccomp, `automountServiceAccountToken: false`, readiness and liveness probes on `/`,
requests 5m/16Mi and limits 100m/48Mi; digest `sha256:712a7ee4…6299` (0.1.37; 0.1.36 was `sha256:40219349…`) in both `config/images.yaml` and the
overlay; cosign signature verified 2026-10-09 (0.1.36) and 2026-10-18 (0.1.37) (F20). Not run: a Trivy *config* scan of the Dockerfile and
manifests (F17).

### B.SC-1 ID-constant trace

| Location | Network | Value | original-id or published-at | Matches the latest on-chain version |
| --- | --- | --- | --- | --- |
| access-gate-client 0.0.8 `deployments` (resolved from npm at build; the only source) | testnet | `access_gate` `0xd7ddaa94…88c9` | both (fresh publication 2026-10-09) | Y — access-gate-sui commit `7906954`; live bundle read 2026-10-09 |
| same | testnet | PlatformConfig `0x3f81489d…e7b5` | n/a (shared object) | Y — same bundle read |
| any `VITE_*`, `src/` literal, `.env.example` | any | none | — | Y — grep finds no 0x id in `src/` |
| mainnet, localnet | — | none recorded | — | n/a — `accessGateDeployment` throws; notice |

### B.SC-2 Coupling table

| Move function | Builder (access-gate-client) | Test asserting target + arguments |
| --- | --- | --- |
| `create_gate` / `create_free_gate` | `buildCreateGateTx` via `gates.ts` `buildNewGateTx` | client builder tests; this app `gates.test.ts` (latest package and PlatformConfig) |
| `set_price` / `make_gate_free` | `buildSetPriceTx` / `buildMakeGateFreeTx` | client tests; weekly ABI-drift suite (`GRPC_TESTNET`) |
| `airdrop` | `buildAirdropTx` | client tests; short-address refusal (F9) |
| setters, `set_paused`, `make_gate_immutable` | `buildSet*Tx`, `buildMakeGateImmutableTx` | client tests and drift suite |

## Section C — Test-coverage & hermetic/live split

### C.1 Coverage grade — B (49/49, 2026-10-18)

Vitest 5.0.3, 9 files: `pricing.test.ts`, `validation.test.ts`, `gates.test.ts`, `gate-card.test.ts`,
`freeze-gate-button.test.ts`, and since 0.1.37 `config.test.ts` (policy rule, abort messages 15 and 16),
`create-gate-form.test.ts` (invalid policy blocks Create), `design-tokens-used.test.ts` (tokens exist,
`--warning` not text) and `env-example.test.ts` (`VITE_*` inventory). Pricing conversions and operator
configuration, image URL rules, deployment-id wiring and `executeTx` (confirmed, aborted and unconfirmed
transactions), the seal link and price display, and the freeze guard. Builders and parsers are tested in
access-gate-client; the settings (including the F16 conditional editor) and airdrop components have no
component tests (their logic is the tested helpers). No Playwright suite exists. Gating variables: none;
the suite is hermetic. The suite runs in `node-ci.yml` and so in both release gates (F13).

### C.2 Hermetic vs. live paths

| Path | Hermetic? | Deferred to | Tracking |
| --- | --- | --- | --- |
| Validation, pricing, components | yes | — | `npm test` |
| Create, settings, airdrop, freeze against real objects | no | testnet | access-gate-client `GRPC_TESTNET` and ABI-drift tests (PASS 2026-10-09 against the new package); manual console run |
| Browser contrast (axe) of this app's own components | no | `@meddleware/ui` gallery covers shared components only | — (colour tokens pinned by `design-tokens-used.test.ts`, F14) |

## Section D — Deployment-readiness gates

### pre-localnet

- [x] builds; type-check, three linters, unit tests green (2026-10-18, 49 tests); no secrets in source
- [x] no `v-html`; the one dynamic `:href` is allowlisted (F2, F7); no secret `VITE_*`
- [x] `VITE_*` inventory matching `.env.example` — F15 fixed 0.1.37; `tests/env-example.test.ts` pins it (commit `7797228`)

### pre-testnet

- [x] deployed with digest pinning; CSP and HSTS verified live 2026-10-09 and again on 0.1.37 on 2026-10-18 (`curl -I`: CSP, HSTS, `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`)
- [x] `SECURITY.md` present; F7–F10 fixed
- [x] image: digest-pinned bases, non-root, restricted pod, probes and limits, deployed by digest, signed with SBOM and provenance, scanned before signing (F17)
- [x] consumed IDs are the latest on-chain version — live bundle carries `0xd7ddaa94…` and `0x3f81489d…` only (B.SC-1)
- [x] signing UX shows action, amount and recipients; double-submit blocked; storage not used
- [x] every test project runs in CI — F13: `node-ci.yml` `npm test` (`38b4d33`), called by both release workflows (0.1.37)
- [x] colour: warning text meets AA on the light theme — F14: `--warning-text`, pinned by `tests/design-tokens-used.test.ts` (0.1.37, commit `7797228`)
- [x] a policy built from configuration cannot be invalid — F12: `validateGatePolicy` at load, notice + disabled Create, `tests/config.test.ts`, `tests/create-gate-form.test.ts` (0.1.37, commit `7797228`)

### pre-mainnet

- [ ] `access_gate` mainnet deployment recorded in access-gate-client (`deployments`), then a release — mainnet-blocked
- [ ] a mainnet create, airdrop and freeze run from the console — mainnet-blocked
- [x] CSP and HSTS on the one hosting path (B.VUE-1); typed confirmation for the irreversible freeze (F3)
- [x] wallet change events and switch/disconnect handling — wallet-adapter 0.0.17 (own audit) and I8 here
- [ ] registry credential inventory and rotation (F21) — `OPERATOR_TASKS.md` "Image registry credentials"
- [ ] external review — maintainer item (`OPERATOR_TASKS.md` "Funding, grants and an external audit")

## Cross-project themes

- **Supply chain & release integrity** — lockfile (also shipped in the image); first-party libraries at
  their latest versions; signed images with SBOM and provenance, Trivy before signing, SHA-pinned
  actions, grouped Dependabot; expiring audit allowlist (F11); publish authority in B.2.
- **Wire-format coupling** — none here: events, byte layouts and proofs are access-gate-client's.
- **On-chain-truth boundary** — prices, commission and fees are read live and enforced by the
  contract; the console only formats them.
- **Deployment readiness** — Section D.
- **Chain-access layering** — all chain logic in access-gate-client (the recipient check, F9, went there,
  not into the form); the `suiBoundary` lint enforces it. IDs consumed: B.SC-1.

## Normative requirements (MUST / MUST NOT)

- **SC-M1–SC-M10** — hold through access-gate-client (SC-M6 to SC-M9 are N/A: this app verifies no
  signature, binds no event, signs no dry-run PTB and extracts no created object). SC-M5: the network,
  ids, client and wallet chain follow one selector; empty ids fail closed.
- **TS-M1–TS-M9** — hold. TS-M9: `@mysten/sui` is a single copy; wallet-adapter is a peer. The lens's
  Section C rule that every test project runs in CI is met (F13).
- **VUE-M1–VUE-M9** — hold (VUE-M3 N/A: no test hooks; VUE-M7 N/A: no storage); VUE-M2 holds (F15
  fixed); the *Colour & links* category holds (F14 fixed).
- **IMG-M1–IMG-M8** — hold; IMG-M8 holds: no command is published here and the cluster check pins the publish workflow and tag refs (F20, RESOLVED 2026-10-18).

## Implementation suggestions (SHOULD / MAY)

- `@mysten/wallet-standard` stays: nothing here imports it, but `@meddleware/wallet-adapter` lists it as a
  peer dependency (`>=0.0.12 <0.2.0` of it is our own peer), so removing it would leave the dev install
  with an unmet peer (re-checked 2026-10-18; the earlier suggestion to drop it is withdrawn).
- SHOULD add component tests for the settings panel (the F16 conditional editor) and the create form's
  policy summary (the invalid-policy guard is tested, F12).
- MAY switch the price inputs to `type="text" inputmode="decimal"` so prices above about 10⁷ SUI keep
  MIST precision while typing (today a number input rounds past 17 significant digits; such prices
  are not expected).
- MAY run a Trivy configuration scan of the Dockerfile and manifests in CI.

## Open questions (`OQ#`)

- **OQ1** — (Decided 2026-09-18: format guard, later the deployments record — see F1.)
- **OQ2** — (Decided 2026-09-18: `nftImageUrl` is only an input here; consumers that render it
  validate the scheme — see F2, F8.)
- **OQ3** — Was omitting `.env.local` from `.gitignore` intentional? (Decided 2026-10-03: no; ignored
  — see F4.)

## Risks

- **Full-node liveness** — listing gates and reading platform terms need a working gRPC endpoint;
  without one the console shows an error and builds nothing.
- **Registry tokens** — long-lived robot tokens for image pushes (F21).
- **Third-party UI packages** — the console trusts ui, wallet-adapter and access-gate-client at the
  versions the lockfile pins; their audits are separate.
- **Operator build configuration** — the baked gate policy and price floor are the operator's choice and
  permanent per created gate; an invalid combination is now refused with a configuration error (F12).

## Re-verification log

- 2026-09-18 — first-pass baseline (F1–F6).
- 2026-09-30 — B2/B3: builders, reads and ids from access-gate-client; image URL rules (F8).
- 2026-10-02 — B8: seal link through `safeHref` (F7, 0.1.25); access-gate-client 0.0.3 (0.1.27);
  wallet-adapter 0.0.13 (0.1.28, publish blocked by F11).
- 2026-10-03 — re-verified under AUDIT_TEMPLATE.md + SUI_CLIENT + TS + VUE + IMG (Phase 7): front
  matter, lens sections and four-part closing added. F11 RESOLVED (0.1.29); F4, F9, F10 RESOLVED
  (0.1.30). Counts: 27/27.
- 2026-10-03 — 0.1.30 deployed; live sweep and dashboard tab clean.
- 2026-10-08 — Lens dates reconciled with the registry (`check-template-dates.mjs`): base 2026-10-08, and SUI_CLIENT/GO 2026-10-08 and TS 2026-10-03 where cited. The changes (AUTH/PLATFORM/MCP/DB registered, the GO token row moved to AUTH, JSR in trusted publishing, layered injection guards) alter no disposition here.
- 2026-10-09 — re-verified against 0.1.36 (releases 0.1.31 to 0.1.36): every finding re-checked against the
  code, tests, workflows, manifests and the live site. Template dates now cite the registry (VUE, TS, IMG
  2026-10-08), with the new VUE *Colour & links* category and the IMG extensions applied. Front matter
  gained the lens fields (build tool, hosting, VITE_* inventory, images, base images, runtime user) and a
  current deployment status (0.1.36, `sha256:40219349…`, access_gate `0xd7ddaa94…`). F1 evidence updated
  to the republished package; F4 corrected (`VITE_NETWORK` not in `.env.example`, F15); F5, F6, F11
  re-confirmed. New: F12 (invalid operator policy combination, DEFERRED), F13 (unit tests not run in
  CI or the release gate since `d617171`, DEFERRED), F14 (`--warning` as text, DEFERRED; design-tokens
  F10), F15 (DEFERRED), F16 (soulbound toggle and default-credits editor removed, RESOLVED 0.1.32), F17
  (release gate, Trivy, lockfile, notices, `USER 65534`, RESOLVED 0.1.35–0.1.36), F18 (blanket
  `connect-src`, ACCEPTED-RISK), F19 (npm gate subset, ACCEPTED-RISK), F20 (cosign identity,
  ACCEPTED-RISK), F21 (registry credentials, DEFERRED maintainer). Section A gained I9 to I11 and the
  lens categories; B.SC-1, B.SC-2 and the shared-dependency matrix added; D gates updated. Counts: 21
  findings — 11 RESOLVED (F1, F4–F11, F16, F17), 1 Positive (F2), 1 ADJUDICATED (F3), 3 ACCEPTED-RISK
  (F18–F20), 5 DEFERRED (F12–F15 next patch; F21 maintainer); tests 27/27, `vue-tsc`, three linters and
  the audit gate green.
- 2026-10-18 — fix wave, 0.1.37. Dependencies: access-gate-client ^0.0.9, design-tokens ^0.1.10,
  `@mysten/sui` ^2.36.0, `@mysten/wallet-standard` ^0.21.34 (ui and wallet-adapter already latest);
  static-server 0.1.8 (`sha256:e32cf42b…4000`, digest read from quay.io). F12 RESOLVED (policy validated at
  load/mount, Create disabled, README and `.env.example` state the dependency), F13 RESOLVED (verified:
  `npm test` in `node-ci.yml` since `38b4d33`), F14 RESOLVED (`--warning-text`; token test), F15 RESOLVED
  (`.env.example`; inventory test), F19 RESOLVED (`npm-publish.yml` `verify` calls `node-ci.yml`); F16
  and F17 notes updated; I10, I11 and the lens rows now HOLD; Section D F12–F15 ticked. Created
  `CHANGELOG.md` (the `files` list named it). F18 (blanket `connect-src`) stays ACCEPTED-RISK (F20 was RESOLVED later the same day by the workspace default, see the last entry), F21
  stays maintainer; the mainnet and external-review gates are untouched. Local checks: type-check, lint:css,
  lint:js, lint:html, 49/49 tests, build, `check:licenses`, audit gate (1 allowlisted, 0 open). No Playwright
  suite exists. Counts: 21 findings — 16 RESOLVED (F1, F4–F17, F19), 1 Positive (F2), 1 ADJUDICATED (F3),
  2 ACCEPTED-RISK (F18, F20), 1 DEFERRED (F21, maintainer); superseded by the last entry (F20 RESOLVED). Commit pending.
- 2026-10-18 — released and deployed (`v0.1.37` = `1875326`, `0.1.37@sha256:712a7ee487f4ace04adb91233a72f3f29927e8ae84417eec7d4e886917876299`), verified live. Cosign keyless signature verified against the workflow-anchored identity (`verify-digests.sh` 16/16); published to npm and as an image; rollout (`apply.sh access-gate-ui`) succeeded; the page loads in headless Chromium with no console errors or CSP violations, headers present (re-read with `curl -I`), and the live bundle carries only the current ids. Mainnet-blocked, credential and external-review gates unchanged.
- 2026-10-18 — F20 (cosign identity) RESOLVED: the default identity in `bootstrap/images/verify-digests.sh` is now workflow-anchored (`^https://github\.com/meddleware-org/${name}/\.github/workflows/docker-publish\.yml@refs/tags/v`); all 16 deployed and contingency images verified valid against it (`STRICT=0 bash bootstrap/images/verify-digests.sh`). This repository publishes no verify command, so nothing else remained. Counts: 21 findings — 17 RESOLVED (F1, F4–F17, F19, F20), 1 Positive (F2), 1 ADJUDICATED (F3), 1 ACCEPTED-RISK (F18), 1 DEFERRED (F21, maintainer).
- 2026-10-19 — dependency-bot status checked (read-only): `.github/dependabot.yml` carries the `ignore` rules and the repository has no open Dependabot pull requests (`gh pr list`, 2026-10-19). Versions, findings and gates were not re-examined in this pass.
  - `Dockerfile` on GitHub `main` now pins the `static-server` base at `0.1.9@sha256:af6cc284…edc72` (merged Dependabot docker PR); this repo was not re-released or redeployed for it, so the deployed image is still built on the 0.1.8 base (the stock default CSP added in 0.1.9 is replaced by this repo's own `CONTENT_SECURITY_POLICY`).
  - Dependabot policy encoded in .github/dependabot.yml (majors declined); open PRs merged 2026-10-19
  - `docker-publish.yml`: the private rebuild jobs are replaced by one `mirror-private` job that copies the published quay.io image (and its cosign artifacts) to the self-hosted registry by digest and fails unless the digest and the signature match (build once, promote by digest; committed locally, not yet released; the `PRIVATE_REGISTRY_*` credentials are still unset).
- 2026-10-20 — image build moved off QEMU in 0.1.38 (commit c06bbcd): the build stage is `FROM --platform=$BUILDPLATFORM` (its output is architecture-independent static files) and the runtime stage only `COPY`s into the multi-arch static-server image; `docker-publish.yml` has no `docker/setup-qemu-action` step, so no privileged binfmt step runs in the release. Proof with rootless podman: the 0.1.37 sources with only the Dockerfile change give the same SHA-256 for every served file, the lockfile and `THIRD_PARTY_LICENSES` as the published 0.1.37 image, for amd64 (the whole image) and for the former arm64 build (every file the build stage produces; the static-server binary comes from the base, which podman 4.9 resolves to the host architecture). Checks: `npm ci`, type-check, lint, unit tests, build, `check:licenses`, `check:csp`/audit gate. No finding changed.
- 2026-10-22 (audit close-out) — release 0.1.39 (`v0.1.39` = `2f5e24e`; `Publish (npm)` and `Publish (Docker)` succeeded). Image base: static-server 0.1.11 (Go 1.26.10 standard library, CVE-2026-111943, so the scan-before-sign gate passes; static-server F13). No disposition change. Not re-run in this pass: the unit tests, the build and the audit gate (the tag's own CI and publish runs succeeded).

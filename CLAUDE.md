# CLAUDE.md — @meddleware/access-gate-ui

## What this app is

A standalone Vue 3 SPA operator console for the `access_gate` primitive: create gates, list the
gates the connected wallet administers, and run every AdminCap-gated action (settings, pause,
airdrop, freeze). It is a **Sui tool**, deliberately unrelated to Walrus — later it folds into
the main Meddleware dashboard alongside the other tools.

## Architectural invariants

- **No on-chain logic here — extend the domain client.** `suiBoundary()` from
  `@meddleware/eslint-config` (the last entry in `eslint.config.ts`) forbids, in `src/` outside
  `src/wallet.ts`: value imports of `@mysten/sui/{grpc,client,transactions}` (type-only imports are
  fine; `@mysten/sui/jsonRpc` is banned outright), building transactions and chain reads. URL
  bindings on native elements must go through `safeHref`, `safeIcon`, `suiExplorerUrl` or
  `walruscanBlobUrl`. Do not disable it — move the logic into the domain client instead.
- **One wallet-adapter in a host.** Declare `@meddleware/wallet-adapter` as a peerDependency (`>=0.0.12 <0.2.0`, plus a devDependency):
  the host's single copy must satisfy every embedded tool, or each gets its own connection.
- **Thin app — no on-chain logic here.** Every PTB (`create_gate`, the setters, `airdrop`,
  `make_gate_immutable`) and every read (`fetchOwnedGates`, `fetchGate`, `fetchPlatformConfig`)
  comes from `@meddleware/access-gate-client`. The app only wires forms → builders → the wallet
  executor. Failed actions show `errorMessage(e)`, which names the `access_gate` abort.
  Do not construct `moveCall`s or parse RPC objects in this repo — add them to the library so
  the future dashboard reuses them.
- **Commission enforcement.** The `access_gate` package and `PlatformConfig` ids come from
  `@meddleware/access-gate-client/deployments` (generated from `access-gate-sui`'s published
  records) through `requireDeployment()` in `src/config.ts`. Gates are always created under that
  package, so every purchase routes the platform commission to Meddleware. The ids are **not**
  exposed as env vars or UI fields. Do not make them configurable.
- **One network source.** The network is wallet-adapter's shared `useNetwork()` selector (the
  standalone `main.ts` selects `VITE_NETWORK`). The client, the ids and explorer links all follow
  it; gate lists reload on a network change. On a network without a recorded deployment the view
  shows a notice and builds nothing.
- **Wallet-agnostic + shared.** Wallet access goes through `src/wallet.ts`, a thin shim over the
  shared `@meddleware/wallet-adapter` singleton (client and executor for the selected network). The singleton means
  that when `AccessGateView` is embedded in the dashboard alongside other tool views, they all
  share one connection. Do not reintroduce a local wallet-standard implementation or a specific
  wallet adapter.
- **Operator-configurable env: network + gate-creation policy.** `VITE_NETWORK`, the `GatePolicy`
  flags (`VITE_GATE_FREEZE_REQUIRES_UNPAUSED`,
  `VITE_GATE_LOCK_COMMISSION_ON_FREEZE`, `VITE_GATE_PAUSE_BLOCKS_DECRYPTION`,
  `VITE_GATE_PAUSE_BLOCKS_ACCESS`; default false) and the price floor (`VITE_GATE_MIN_PRICE_MIST` =
  `auto` | a higher MIST floor, `VITE_GATE_ALLOW_FREE`). No commission or package knobs — commission,
  minimum paid price and the free-gate fee live on-chain in `PlatformConfig`, read live (fail closed
  if unreadable).
- **Checked inputs.** NFT image URLs must be https or a `data:image/` URI (`src/validation.ts`).
- **Confirmed writes.** `executeTx` throws if the transaction fails on-chain (carrying the abort) or
  cannot be confirmed — never reports an unconfirmed write as done.

## Layer map

| File | Responsibility |
| --- | --- |
| `src/config.ts` | `network` (wallet-adapter selector), `explorerNetwork`, `requireDeployment()` / `deployed` (ids from access-gate-client `deployments`), `GATE_POLICY`, `GATE_MIN_PRICE`, `GATE_ALLOW_FREE` (from env) |
| `src/validation.ts` | `imageUrlError` — https or `data:image/` only |
| `src/pricing.ts` | Pure price rules: exact `suiToMist`/`mistToSui`, `gatePriceError` |
| `src/wallet.ts` | Shim over `@meddleware/wallet-adapter` for the selected network; re-exports `useWallet` / `getSuiClient` / `buildExecutor` / `Executor` |
| `src/gates.ts` | Binds the network's deployment to access-gate-client: `listMyGates`, `refreshGate`, `adminContext`, `buildNewGateTx`, `executeTx`, `errorMessage`, `getPlatformConfig`, `minimumGatePriceMist`, `buildPriceChangeTx`, `buildGateAirdropTx` |
| `src/App.vue` | Standalone shell only: `AppHeader` (+ wallet connect, `ColorModeControl`) + `<AccessGateView>` + `AppFooter` |
| `src/components/AccessGateView.vue` | Core tool UI (tabs, gate loading via an `account` watcher). Exported from `src/index.ts` for inline embedding. |
| `src/index.ts` | Library entry — exports `AccessGateView` for the dashboard to render inline |
| `src/components/*` | `CreateGateForm`, `GateList`, `GateCard`, `GateSettingsPanel`, `AirdropForm`, `FreezeGateButton` |

## Dual app + library

This package is **both** a standalone SPA (`App.vue` + `main.ts`, `vite build`) and a library
(`src/index.ts` exports `AccessGateView`, resolved via `"exports"`). The dashboard imports
`AccessGateView` and wraps it in its own shell + shared wallet. Gate loading is driven by an
`account` watcher in the view, so it works whether the connection is made from this app's header
(standalone) or the dashboard's shared control (embedded). Keep the core UI in `AccessGateView.vue`
(shell-free); `App.vue` must remain a thin shell.

## Data flow

1. `App.vue` connects a wallet and calls `listMyGates(address)` → `fetchOwnedGates` (owned
   `AdminCap`s → their `gate_id`s → the `Gate` objects).
2. A management control builds its PTB with an access-gate-client `build*Tx` + `adminContext(gate)`,
   then `executeTx(tx)` signs/executes/awaits.
3. On success the component emits `changed`; `App.vue` re-runs `listMyGates` to refresh state.

## Freeze is irreversible

`make_gate_immutable` consumes the `AdminCap` and permanently ends all settings + airdrops
(purchases/consumption continue). `FreezeGateButton.vue` guards it behind a typed `FREEZE`
confirmation. Keep that guard.

## What NOT to do

- Do not add `moveCall`s / RPC parsing here — extend `@meddleware/access-gate-client` instead.
- Do not make the access_gate package ID configurable (breaks commission enforcement).
- Do not add accounting/price-derivation logic — on-chain is the source of truth.
- Do not expose the platform (Meddleware-only) setters `set_platform_treasury` /
  `set_commission_bps` in this operator app.

---

## Deferred documentation — NOT for the `docs.` website (planned here per Part 0.4)

> Captured for the future **`dev.meddleware.co.uk`** subdomain and white-label offering; excluded
> from the user-facing `docs.` site (which explains the operator console in plain terms).

### `dev.` — developer integration (to write later)

- **Embed `AccessGateView`** (`import { AccessGateView } from '@meddleware/access-gate-ui'`) with the
  shared `@meddleware/wallet-adapter`; the dual app+library contract and the `account`-watcher data
  flow. SDK-level builders/reads are documented in `@meddleware/access-gate-client`.

### White-label operator path (to write later)

- Operators running the console for **their own gates** under the shared platform: what is
  operator-controlled (gate config, airdrops, freeze) vs fixed (the deployment ids from `deployments` +
  commission routing to Meddleware — deliberately not configurable). Branding seams
  (`@meddleware/design-tokens`, `AppHeader`). Note the platform-only setters are intentionally hidden.

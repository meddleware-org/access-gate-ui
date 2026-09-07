# CLAUDE.md — @meddleware/access-gate-ui

## What this app is

A standalone Vue 3 SPA operator console for the `access_gate` primitive: create gates, list the
gates the connected wallet administers, and run every AdminCap-gated action (settings, pause,
airdrop, freeze). It is a **Sui tool**, deliberately unrelated to Walrus — later it folds into
the main Meddleware dashboard alongside the other tools.

## Architectural invariants

- **Thin app — no on-chain logic here.** Every PTB (`create_gate`, the setters, `airdrop`,
  `make_gate_immutable`) and every read (`fetchOwnedGates`, `fetchGate`) comes from
  `@meddleware/nft-gate-client`. The app only wires forms → builders → the wallet executor.
  Do not construct `moveCall`s or parse RPC objects in this repo — add them to the library so
  the future dashboard reuses them.
- **Commission enforcement (hardcoded).** `src/constants.ts` hardcodes `ACCESS_GATE_PACKAGE_ID`
  and `ACCESS_GATE_PLATFORM_CONFIG_ID` per network — copied from `@meddleware/walrus-relay`'s
  `constants.ts` (same deployment). Gates are always created under this package, so every
  purchase routes the 20 bps commission to Meddleware. The package ID is **not** exposed as an
  env var or UI field. Do not make it configurable.
- **Wallet-agnostic + shared.** Wallet access goes through `src/wallet.ts`, a thin shim over the
  shared `@meddleware/wallet-adapter` singleton (binds this app's `RPC_URLS`). The singleton means
  that when `AccessGateView` is embedded in the dashboard alongside other tool views, they all
  share one connection. Do not reintroduce a local wallet-standard implementation or a specific
  wallet adapter.
- **Operator-configurable env is only network/RPC.** `VITE_NETWORK`, `VITE_RPC_TESTNET/MAINNET`.
  No commission or package knobs.

## Layer map

| File | Responsibility |
| --- | --- |
| `src/constants.ts` | Hardcoded package + PlatformConfig ids; `accessGateNftType` |
| `src/config.ts` | `SuiNetwork`, `NETWORK`, `RPC_URLS` (from env) |
| `src/wallet.ts` | Shim over `@meddleware/wallet-adapter` binding this app's `RPC_URLS`; re-exports `useWallet` / `getSuiClient` / `buildExecutor` / `Executor` |
| `src/gates.ts` | Binds the network + hardcoded package to nft-gate-client: `listMyGates`, `refreshGate`, `adminContext`, `executeTx` |
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
2. A management control builds its PTB with a `nft-gate-client` `build*Tx` + `adminContext(gate)`,
   then `executeTx(tx)` signs/executes/awaits.
3. On success the component emits `changed`; `App.vue` re-runs `listMyGates` to refresh state.

## Freeze is irreversible

`make_gate_immutable` consumes the `AdminCap` and permanently ends all settings + airdrops
(purchases/consumption continue). `FreezeGateButton.vue` guards it behind a typed `FREEZE`
confirmation. Keep that guard.

## What NOT to do

- Do not add `moveCall`s / RPC parsing here — extend `@meddleware/nft-gate-client` instead.
- Do not make the access_gate package ID configurable (breaks commission enforcement).
- Do not add accounting/price-derivation logic — on-chain is the source of truth.
- Do not expose the platform (Meddleware-only) setters `set_platform_treasury` /
  `set_commission_bps` in this operator app.

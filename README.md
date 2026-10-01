# @meddleware/access-gate-ui

[![License: 0BSD](https://img.shields.io/badge/license-0BSD-blue)](LICENSE)

A standalone Vue 3 operator console for on-chain **access gates** on Sui. Any third party can
create a gate, sell NFT-gated access to a resource (an upload relay, an API, a website, a game),
and manage it — all client-side, signing with their own wallet.

Gates are created under Meddleware's published `access_gate` package, so a 20 bps commission on
every purchase is structurally routed to the Meddleware treasury on-chain (see
[access-gate-sui](https://github.com/meddleware-org/access-gate-sui)).

Served at `sui-access-gate.meddleware.co.uk`. Later it will also be embedded in the main
Meddleware dashboard alongside the other Sui tools.

## Features

- Connect any Sui wallet (wallet-standard)
- **Create a gate** — price, uses (unlimited pass or single-use), soulbound, auto-burn, and NFT metadata
- **My gates** — discover every gate the connected wallet administers (via its owned `AdminCap`s)
- **Manage** — update price, payment recipient, default uses, soulbound, auto-burn, and NFT metadata; pause/unpause purchases
- **Airdrop** — grant access NFTs to any address for free
- **Freeze** — make a gate immutable (irreversible, typed confirmation)

## Local development

```bash
npm install
npm run dev
```

> `@meddleware/access-gate-client` resolves from the npm registry. To develop against an unpublished
> local copy, use `npm link @meddleware/access-gate-client` or an `overrides` entry.

## Environment variables

All `VITE_*` vars are baked into the static bundle at build time.

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_NETWORK` | `testnet` | Network the standalone build selects (`testnet` or `mainnet`); embedded, the host's selector rules |
| `VITE_GATE_FREEZE_REQUIRES_UNPAUSED` | `false` | Created gates can't be frozen while paused |
| `VITE_GATE_LOCK_COMMISSION_ON_FREEZE` | `false` | Freezing a created gate locks in the platform commission |
| `VITE_GATE_PAUSE_BLOCKS_DECRYPTION` | `false` | Pausing a created gate also blocks Seal decryption |
| `VITE_GATE_PAUSE_BLOCKS_ACCESS` | `false` | Pausing a created gate also blocks pass use (`consume`, relay uploads) |
| `VITE_GATE_MIN_PRICE_MIST` | `auto` | Minimum paid price: `auto` = the on-chain minimum (10 × the platform's minimum commission, read live from `PlatformConfig`); a MIST integer raises it further |
| `VITE_GATE_ALLOW_FREE` | `true` | Allow price-0 gates (each pays the platform's one-off free-gate fee) |
| `VITE_DOCS_URL` / `VITE_DEV_URL` | Meddleware docs | Header documentation links |

The four `VITE_GATE_*` restriction flags form the gate's on-chain `GatePolicy`: it is recorded
immutably on every gate the tool creates, and anyone can read it from the gate. The policy is set by
this tool, not enforced on gates created by calling the contract directly. The platform's commission
floor, minimum paid price and free-gate fee are enforced on-chain for every gate of the package.
When `AccessGateView` is embedded (e.g. in the dashboard), the host app's build supplies these
variables.

The `access_gate` package ID and `PlatformConfig` object ID come from
`@meddleware/access-gate-client/deployments` for the active network (commission enforcement) and
are not configurable.

## Docker build

The Docker context is this repo root; `@meddleware/access-gate-client` resolves from npm, so it must
be published first.

```bash
docker build --build-arg VITE_NETWORK=testnet -t access-gate-ui:latest .
```

## Architecture

Thin app — no accounting logic. Every PTB (create/setters/airdrop/freeze) and every on-chain read
comes from `@meddleware/access-gate-client`; the app only wires forms to those builders and the
wallet executor. See [CLAUDE.md](CLAUDE.md).

## License

0BSD

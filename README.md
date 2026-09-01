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

> `@meddleware/nft-gate-client` resolves from the npm registry. To develop against an unpublished
> local copy, use `npm link @meddleware/nft-gate-client` or an `overrides` entry.

## Environment variables

All `VITE_*` vars are baked into the static bundle at build time.

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_NETWORK` | `testnet` | `testnet` or `mainnet` |
| `VITE_RPC_TESTNET` | `https://sui-testnet-rpc.publicnode.com` | Sui JSON-RPC for testnet |
| `VITE_RPC_MAINNET` | `https://fullnode.mainnet.sui.io:443` | Sui JSON-RPC for mainnet |

The `access_gate` package ID and `PlatformConfig` object ID are **hardcoded** in
`src/constants.ts` (commission enforcement) and are not configurable.

## Docker build

The Docker context is this repo root; `@meddleware/nft-gate-client` resolves from npm, so it must
be published first.

```bash
docker build --build-arg VITE_NETWORK=testnet -t access-gate-ui:latest .
```

## Architecture

Thin app — no accounting logic. Every PTB (create/setters/airdrop/freeze) and every on-chain read
comes from `@meddleware/nft-gate-client`; the app only wires forms to those builders and the
wallet executor. See [CLAUDE.md](CLAUDE.md).

## License

0BSD

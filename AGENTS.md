# AGENTS.md — @meddleware/access-gate-ui

## Package

`@meddleware/access-gate-ui` — standalone Vue 3 operator console for on-chain access gates on Sui.
Deployed at `sui-access-gate.meddleware.co.uk`.

## Key files

| File | Purpose |
| --- | --- |
| `src/App.vue` | Root: wallet connect, tabs (My gates / Create gate), gate loading |
| `src/config.ts` | `network`, `requireDeployment()` (ids from access-gate-client `deployments` — commission routing), gate-creation policy |
| `src/validation.ts` | `imageUrlError` |
| `src/wallet.ts` | shim over `@meddleware/wallet-adapter`; `Executor`, `buildExecutor`, `getSuiClient` |
| `src/gates.ts` | `listMyGates`, `refreshGate`, `adminContext`, `buildNewGateTx`, `executeTx`, `errorMessage` |
| `src/components/CreateGateForm.vue` | `create_gate` form |
| `src/components/GateList.vue` / `GateCard.vue` | list + per-gate summary/expand |
| `src/components/GateSettingsPanel.vue` | the 9 setters + pause toggle |
| `src/components/AirdropForm.vue` | `airdrop` to an address |
| `src/components/FreezeGateButton.vue` | `make_gate_immutable` (typed confirm) |
| `Dockerfile` | standalone build → static-server:0.1.0 runtime |

## Build and development commands

```bash
npm install
npm run dev           # local dev server
npm run build         # production build to dist/
npm run type-check    # vue-tsc type check
```

## Docker build (context = repo root)

```bash
docker build --build-arg VITE_NETWORK=testnet -t access-gate-ui:latest .
```

## Version

See `package.json`.

## Relationship to access-gate-client

Depends on `@meddleware/access-gate-client` for all PTB builders, gate discovery, abort messages and
the deployment ids. Any new on-chain interaction goes into that library first, then is consumed here.

## Follow-ups (outside this repo)

- k8s ingress / Cloudflare tunnel for `sui-access-gate.meddleware.co.uk` (infra monorepo).
- Add the tool to the `sui.meddleware.co.uk` hub (`apps/sui-dashboard`).
- Fold into the main dashboard when it is built.

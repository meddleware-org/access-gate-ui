// Build-time configuration (Vite inlines VITE_*). Operators configure the network, RPC URLs and
// the gate-creation policy (restrictions + minimum price); the access_gate packageId +
// PlatformConfig id are hardcoded in constants.ts (commission enforcement).
import type { GatePolicy } from '@meddleware/nft-gate-client'

/** Sui network. The access_gate contract is deployed per-network. */
export type SuiNetwork = 'testnet' | 'mainnet'

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {}

/** Active network, from `VITE_NETWORK` (default `testnet`). */
export const NETWORK: SuiNetwork = (env.VITE_NETWORK as SuiNetwork) || 'testnet'

/**
 * gRPC-web endpoint used to build + execute gate transactions and read gate state. The Sui SDK's
 * JSON-RPC client is deprecated, so this must be a gRPC-web-capable endpoint (the Mysten public
 * fullnodes serve gRPC-web at :443 via the browser Fetch transport).
 */
export const RPC_URLS: Record<SuiNetwork, string> = {
  testnet: env.VITE_RPC_TESTNET || 'https://fullnode.testnet.sui.io:443',
  mainnet: env.VITE_RPC_MAINNET || 'https://fullnode.mainnet.sui.io:443',
}

/** Parse a boolean env flag (`true`/`1`/`yes`/`on`, case-insensitive); anything else ⇒ `fallback`. */
export function envFlag(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value.trim() === '') return fallback
  return /^(?:true|1|yes|on)$/i.test(value.trim())
}

/**
 * Immutable restrictions applied to every gate this tool creates (`GatePolicy` on-chain). All
 * default to `false` (unrestricted); an operator re-using this tool can turn any of them on:
 *
 * - `VITE_GATE_FREEZE_REQUIRES_UNPAUSED` — a paused gate cannot be frozen (so a frozen gate can
 *   never be stuck unpurchasable).
 * - `VITE_GATE_LOCK_COMMISSION_ON_FREEZE` — freezing snapshots the platform commission.
 * - `VITE_GATE_PAUSE_BLOCKS_DECRYPTION` — Seal content gated by the gate is undecryptable while
 *   the gate is paused.
 * - `VITE_GATE_PAUSE_BLOCKS_ACCESS` — while paused, passes cannot be used (`consume` aborts and
 *   nft-gate gateways, e.g. the Walrus relay, deny holders). Independent of decryption.
 *
 */
export const GATE_POLICY: GatePolicy = {
  freezeRequiresUnpaused: envFlag(env.VITE_GATE_FREEZE_REQUIRES_UNPAUSED),
  lockCommissionOnFreeze: envFlag(env.VITE_GATE_LOCK_COMMISSION_ON_FREEZE),
  pauseBlocksDecryption: envFlag(env.VITE_GATE_PAUSE_BLOCKS_DECRYPTION),
  pauseBlocksAccess: envFlag(env.VITE_GATE_PAUSE_BLOCKS_ACCESS),
}

/** Minimum paid gate price: the on-chain minimum, or a higher fixed MIST floor. */
export type MinPriceSetting = { kind: 'auto' } | { kind: 'fixed'; mist: bigint }

/**
 * Parse `VITE_GATE_MIN_PRICE_MIST`: `auto` (default) ⇒ the on-chain minimum paid price (10 × the
 * platform's minimum commission, read live from `PlatformConfig`); a non-negative integer ⇒ a fixed
 * floor in MIST, applied only where it is higher than the on-chain minimum (which the contract
 * always enforces). Invalid ⇒ `auto`.
 */
export function parseMinPrice(value: string | undefined): MinPriceSetting {
  const v = value?.trim().toLowerCase()
  if (v && /^\d+$/.test(v)) return { kind: 'fixed', mist: BigInt(v) }
  return { kind: 'auto' }
}

/** Minimum non-zero gate price, from `VITE_GATE_MIN_PRICE_MIST` (default `auto`). */
export const GATE_MIN_PRICE: MinPriceSetting = parseMinPrice(env.VITE_GATE_MIN_PRICE_MIST)

/** Whether free (price 0) gates may be created, from `VITE_GATE_ALLOW_FREE` (default `true`). */
export const GATE_ALLOW_FREE: boolean = envFlag(env.VITE_GATE_ALLOW_FREE, true)

// Configuration. The network is wallet-adapter's shared runtime selector — the one source for the
// client, the access_gate ids and explorer links (the standalone build selects VITE_NETWORK in
// main.ts). The access_gate ids come from @meddleware/access-gate-client/deployments and are not
// configurable (commission enforcement). Operators configure only the gate-creation policy
// (restrictions + minimum price) through VITE_*.
import { computed } from 'vue'
import type { GatePolicy } from '@meddleware/access-gate-client'
import { accessGateDeployment, type AccessGateDeployment } from '@meddleware/access-gate-client/deployments'
import type { SuiNetwork } from '@meddleware/ui'
import { useNetwork } from '@meddleware/wallet-adapter'

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {}

/** The active network (read-only ref). */
export const network = useNetwork().network

/** SuiVision has no localnet; nothing is deployed there, so testnet links are inert. */
export const explorerNetwork = computed<SuiNetwork>(() => (network.value === 'mainnet' ? 'mainnet' : 'testnet'))

/**
 * Meddleware's access_gate deployment on the active network. Every gate created here is created
 * under this package and pays commission to its `PlatformConfig` treasury; the ids are never taken
 * from configuration.
 *
 * @throws {Error} if no deployment is recorded for the active network.
 */
export function requireDeployment(): AccessGateDeployment {
  return accessGateDeployment(network.value)
}

/** True while a deployment is recorded for the active network. */
export const deployed = computed(() => {
  try {
    accessGateDeployment(network.value)
    return true
  } catch {
    return false
  }
})

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

// Thin bindings between the app (active network + hardcoded package) and the reusable
// @meddleware/nft-gate-client library. All PTB construction and on-chain reads live in the
// library; this module only supplies the network's client and the hardcoded package id.
import type { Transaction } from '@mysten/sui/transactions'
import {
  fetchOwnedGates,
  fetchGate,
  fetchPlatformConfig,
  minimumPaidPriceMist,
  gateCommissionMist,
  buildAirdropTx,
  buildMakeGateFreeTx,
  buildSetPriceTx,
} from '@meddleware/nft-gate-client'
import type { OwnedGate, GateAdminContext, PlatformConfigInfo } from '@meddleware/nft-gate-client'
import { NETWORK, GATE_MIN_PRICE } from './config.js'
import { ACCESS_GATE_PACKAGE_ID, ACCESS_GATE_PLATFORM_CONFIG_ID } from './constants.js'
import { getSuiClient, buildExecutor } from './wallet.js'

/** The access_gate package id for the active network (hardcoded — commission enforcement). */
export const PACKAGE_ID = ACCESS_GATE_PACKAGE_ID[NETWORK]

/** The package's shared `PlatformConfig` for the active network (commission terms and fees). */
export const PLATFORM_CONFIG_ID = ACCESS_GATE_PLATFORM_CONFIG_ID[NETWORK]

/**
 * Read the live `PlatformConfig`.
 *
 * @throws {Error} if it cannot be read (fail closed — nothing is built against unknown terms).
 */
export async function getPlatformConfig(): Promise<PlatformConfigInfo> {
  const platform = await fetchPlatformConfig(getSuiClient(), PLATFORM_CONFIG_ID)
  if (!platform) throw new Error('Could not read the platform configuration (commission and fees).')
  return platform
}

/**
 * The minimum paid gate price in MIST: the on-chain minimum (10 × the platform's minimum
 * commission), raised to `VITE_GATE_MIN_PRICE_MIST` if the operator set a higher fixed floor.
 */
export function minimumGatePriceMist(platform: PlatformConfigInfo): bigint {
  const onChain = minimumPaidPriceMist(platform.minCommissionMist)
  if (GATE_MIN_PRICE.kind === 'fixed' && GATE_MIN_PRICE.mist > onChain) return GATE_MIN_PRICE.mist
  return onChain
}

/** List every gate the given operator address administers (via their owned AdminCaps). */
export async function listMyGates(owner: string): Promise<OwnedGate[]> {
  return fetchOwnedGates(getSuiClient(), owner, PACKAGE_ID)
}

/** Re-read one gate's on-chain state (after a management tx), merging back its known adminCapId. */
export async function refreshGate(gate: OwnedGate): Promise<OwnedGate | null> {
  const fresh = await fetchGate(getSuiClient(), gate.gateId)
  return fresh ? { ...fresh, adminCapId: gate.adminCapId } : null
}

/** Build the AdminCap-gated context for a gate's PTBs. */
export function adminContext(gate: OwnedGate): GateAdminContext {
  return { packageId: PACKAGE_ID, gateId: gate.gateId, adminCapId: gate.adminCapId, platformConfigId: PLATFORM_CONFIG_ID }
}

/**
 * Build the PTB that changes a gate's price. Going free on a gate that has never paid the free-gate
 * fee calls `make_gate_free` (paying the fee); otherwise `set_price`, which the contract rejects
 * below the minimum paid price.
 */
export async function buildPriceChangeTx(gate: OwnedGate, priceMist: bigint): Promise<Transaction> {
  if (priceMist === 0n && !gate.freeFeePaid) {
    const platform = await getPlatformConfig()
    return buildMakeGateFreeTx(adminContext(gate), platform.freeGateFeeMist)
  }
  return buildSetPriceTx(adminContext(gate), priceMist)
}

/** Build an airdrop PTB that pays the commission due at the gate's current price. */
export async function buildGateAirdropTx(gate: OwnedGate, recipient: string): Promise<Transaction> {
  const platform = await getPlatformConfig()
  return buildAirdropTx(adminContext(gate), recipient, gateCommissionMist(gate, platform))
}

/**
 * Sign + execute a built PTB with the connected wallet on the active network and wait for
 * finality. Returns the transaction digest.
 *
 * @throws {Error} if no wallet is connected or the wallet rejects/execution fails.
 */
export async function executeTx(tx: Transaction): Promise<string> {
  const executor = await buildExecutor()
  const { digest } = await executor.signAndExecute(tx)
  await executor.waitForTransaction(digest).catch(() => {})
  return digest
}


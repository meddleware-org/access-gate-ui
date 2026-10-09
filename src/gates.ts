// Thin bindings between the app (active network + its access_gate deployment) and
// @meddleware/access-gate-client. All transaction construction and on-chain reads live in the
// library; this module supplies the network's client and the recorded deployment ids.
import type { Transaction } from '@mysten/sui/transactions'
import {
  abortMessage,
  buildAirdropTx,
  buildCreateGateTx,
  buildMakeGateFreeTx,
  buildSetPriceTx,
  fetchGate,
  fetchOwnedGates,
  fetchPlatformConfig,
  gateCommissionMist,
  minimumPaidPriceMist,
} from '@meddleware/access-gate-client'
import type { GateAdminContext, OwnedGate, PlatformConfigInfo } from '@meddleware/access-gate-client'
import { GATE_MIN_PRICE, requireDeployment } from './config.js'
import { getSuiClient, buildExecutor } from './wallet.js'

/**
 * Read the live `PlatformConfig`.
 *
 * @throws {Error} if it cannot be read (fail closed — nothing is built against unknown terms).
 */
export async function getPlatformConfig(): Promise<PlatformConfigInfo> {
  const d = requireDeployment()
  return fetchPlatformConfig(getSuiClient(), d.platformConfigId, d.originalId)
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
  return fetchOwnedGates(getSuiClient(), owner, requireDeployment().originalId)
}

/** Re-read one gate's on-chain state (after a management tx), merging back its known adminCapId. */
export async function refreshGate(gate: OwnedGate): Promise<OwnedGate | null> {
  const fresh = await fetchGate(getSuiClient(), gate.gateId, requireDeployment().originalId)
  return fresh ? { ...fresh, adminCapId: gate.adminCapId } : null
}

/** Build the AdminCap-gated context for a gate's transactions (call target: the latest package). */
export function adminContext(gate: OwnedGate): GateAdminContext {
  const d = requireDeployment()
  return { packageId: d.publishedAt, gateId: gate.gateId, adminCapId: gate.adminCapId, platformConfigId: d.platformConfigId }
}

/** Build the create-gate transaction under the active network's deployment. */
export function buildNewGateTx(opts: Parameters<typeof buildCreateGateTx>[2]): Transaction {
  const d = requireDeployment()
  return buildCreateGateTx(d.publishedAt, d.platformConfigId, opts)
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
 * The message to show for a failed action: the access_gate abort's meaning when the error carries
 * one, otherwise the error's own message.
 */
export function errorMessage(e: unknown): string {
  let abort: string | null | undefined
  try {
    abort = abortMessage(e, requireDeployment().originalId)
  } catch {
    abort = undefined
  }
  return abort ?? (e instanceof Error ? e.message : String(e))
}

/**
 * Sign + execute a built PTB with the connected wallet on the active network and wait until it is
 * indexed, so a following read sees its effects. Returns the transaction digest.
 *
 * @throws {Error} if no wallet is connected, the wallet rejects, the transaction fails on-chain
 *   (the error carries the abort, for {@link errorMessage}), or it cannot be confirmed.
 */
export async function executeTx(tx: Transaction): Promise<string> {
  const executor = await buildExecutor()
  const { digest, success, result } = await executor.signAndExecute(tx, { include: {} })
  if (!success) {
    const status = result.FailedTransaction?.status
    throw Object.assign(new Error(`Transaction ${digest} failed on-chain.`), { error: status?.error ?? null })
  }
  try {
    await executor.waitForTransaction(digest)
  } catch (e) {
    throw new Error(
      `Transaction ${digest} was submitted but could not be confirmed (${e instanceof Error ? e.message : String(e)}). ` +
        'Refresh before retrying.',
    )
  }
  return digest
}

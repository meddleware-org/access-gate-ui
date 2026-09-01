// Thin bindings between the app (active network + hardcoded package) and the reusable
// @meddleware/nft-gate-client library. All PTB construction and on-chain reads live in the
// library; this module only supplies the network's client and the hardcoded package id.
import type { Transaction } from '@mysten/sui/transactions'
import { fetchOwnedGates, fetchGate } from '@meddleware/nft-gate-client'
import type { OwnedGate, GateAdminContext } from '@meddleware/nft-gate-client'
import { NETWORK } from './config.js'
import { ACCESS_GATE_PACKAGE_ID } from './constants.js'
import { getSuiClient, buildExecutor } from './wallet.js'

/** The access_gate package id for the active network (hardcoded — commission enforcement). */
export const PACKAGE_ID = ACCESS_GATE_PACKAGE_ID[NETWORK]

/** List every gate the given operator address administers (via their owned AdminCaps). */
export async function listMyGates(owner: string): Promise<OwnedGate[]> {
  return fetchOwnedGates(getSuiClient(NETWORK), owner, PACKAGE_ID)
}

/** Re-read one gate's on-chain state (after a management tx), merging back its known adminCapId. */
export async function refreshGate(gate: OwnedGate): Promise<OwnedGate | null> {
  const fresh = await fetchGate(getSuiClient(NETWORK), gate.gateId)
  return fresh ? { ...fresh, adminCapId: gate.adminCapId } : null
}

/** Build the AdminCap-gated context (`{ packageId, gateId, adminCapId }`) for a gate's PTBs. */
export function adminContext(gate: OwnedGate): GateAdminContext {
  return { packageId: PACKAGE_ID, gateId: gate.gateId, adminCapId: gate.adminCapId }
}

/**
 * Sign + execute a built PTB with the connected wallet on the active network and wait for
 * finality. Returns the transaction digest.
 *
 * @throws {Error} if no wallet is connected or the wallet rejects/execution fails.
 */
export async function executeTx(tx: Transaction): Promise<string> {
  const executor = await buildExecutor(NETWORK)
  const { digest } = await executor.signAndExecute(tx)
  await executor.waitForTransaction(digest).catch(() => {})
  return digest
}


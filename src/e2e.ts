// End-to-end build only (`vite build --mode e2e`; main.ts loads this when MODE is `e2e` and VITE_E2E is `1`, both static, so every other
// build drops it). A mock wallet is registered like an extension, and the chain client is a stub that holds the platform config and two
// gates the mock account administers, so the connected screens can be shown and checked without a network or a funded key.
import { accessGateDeployment } from '@meddleware/access-gate-client/deployments'
import { MOCK_ADDRESS, createStubClient, installE2eWallet, okTransaction } from '@meddleware/wallet-adapter/testing'

// hex(byte): a 32-byte object id made of one repeated byte, easy to recognise in a test.
const hex = (byte: string) => `0x${byte.repeat(32)}`

/** The two gates the stub chain holds, by object id: a paid soulbound one and a free paused one. */
export const E2E_GATES = { paid: hex('11'), free: hex('22') } as const

/** A complete `Gate` object as the node's core API returns it (the client's parser rejects one with a missing field). */
function gate(over: Record<string, unknown>) {
  return {
    price_mist: '0',
    payment_recipient: MOCK_ADDRESS,
    default_uses: '0',
    soulbound: false,
    auto_burn_at_zero: false,
    paused: false,
    frozen: false,
    nft_name: '',
    nft_image_url: '',
    nft_description: '',
    policy: { freeze_requires_unpaused: false, lock_commission_on_freeze: false, pause_blocks_decryption: false, pause_blocks_access: false },
    locked_commission: null,
    free_fee_paid: false,
    ...over,
  }
}

/** Register the mock wallet with a stub chain that holds the platform config, the two gates and their admin capabilities. */
export function installE2e(): void {
  // The recorded testnet deployment, so the stub's object types match what the client looks for.
  const d = accessGateDeployment('testnet')
  // type(name): the full Move type name of an access_gate object.
  const type = (name: string) => `${d.originalId}::access_gate::${name}`
  const object = (objectId: string, name: string, json: Record<string, unknown>) => ({ objectId, type: type(name), json })
  // The two gates: a paid, soulbound one with ten credits, and a free, paused one whose policy forbids freezing while paused.
  const gates: Record<string, Record<string, unknown>> = {
    [E2E_GATES.paid]: gate({ price_mist: '50000000', default_uses: '10', nft_name: 'Studio pass', soulbound: true }),
    [E2E_GATES.free]: gate({ nft_name: 'Open pass', paused: true, free_fee_paid: true, policy: { freeze_requires_unpaused: true, lock_commission_on_freeze: false, pause_blocks_decryption: false, pause_blocks_access: true } }),
  }
  // The objects the stub returns by id: the platform config (fee, minimum commission, free-gate fee) and the gates.
  const objects: Record<string, unknown> = {
    [d.platformConfigId]: object(d.platformConfigId, 'PlatformConfig', {
      version: '1', treasury: hex('7e'), commission_bps: '20', min_commission_mist: '1000000', free_gate_fee_mist: '100000000',
    }),
  }
  for (const [id, json] of Object.entries(gates)) objects[id] = object(id, 'Gate', json)
  // One admin capability per gate, owned by the mock account.
  const owned = Object.keys(gates).map((id, i) => object(hex(`c${i}`), 'AdminCap', { gate_id: id }))
  // Register the wallet; every transaction "succeeds" with a fixed digest.
  installE2eWallet({ client: createStubClient({ owned, objects, executed: okTransaction(`E2E${'a'.repeat(41)}`) }) })
}

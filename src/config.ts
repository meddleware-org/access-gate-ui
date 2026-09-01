// Build-time configuration (Vite inlines VITE_*). Only the network and RPC URLs are
// operator-configurable; the access_gate packageId + PlatformConfig id are hardcoded in
// constants.ts (commission enforcement).

/** Sui network. The access_gate contract is deployed per-network. */
export type SuiNetwork = 'testnet' | 'mainnet'

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {}

/** Active network, from `VITE_NETWORK` (default `testnet`). */
export const NETWORK: SuiNetwork = (env.VITE_NETWORK as SuiNetwork) || 'testnet'

/**
 * JSON-RPC endpoint used to build + execute gate transactions and read gate state.
 * NOTE: this is JSON-RPC — the public testnet fullnode serves gRPC only, so a JSON-RPC-capable
 * endpoint is used for testnet by default.
 */
export const RPC_URLS: Record<SuiNetwork, string> = {
  testnet: env.VITE_RPC_TESTNET || 'https://sui-testnet-rpc.publicnode.com',
  mainnet: env.VITE_RPC_MAINNET || 'https://fullnode.mainnet.sui.io:443',
}

// Build-time configuration (Vite inlines VITE_*). Only the network and RPC URLs are
// operator-configurable; the access_gate packageId + PlatformConfig id are hardcoded in
// constants.ts (commission enforcement).

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

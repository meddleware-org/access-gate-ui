import type { SuiNetwork } from './config.js'

/**
 * Meddleware's deployed `access_gate` package IDs per network.
 *
 * **Hardcoded — commission enforcement.** Every gate created through this app is created under
 * this package, so every `purchase` on those gates routes the on-chain 20 bps commission to
 * Meddleware's `PlatformConfig` treasury. The package ID is intentionally NOT operator-configurable.
 * Keep these in sync with `@meddleware/walrus-relay`'s `constants.ts` (the same deployment).
 */
export const ACCESS_GATE_PACKAGE_ID: Record<SuiNetwork, string> = {
  testnet: '0x0bedd0b27d993d3292ca6a5315f7562de8bc0ff3752b445b4c53252c76f2d20d',
  mainnet: '', // populated on mainnet deploy
}

/**
 * Meddleware's `PlatformConfig` shared object IDs per network. Governs the commission split on
 * every NFT purchase. Not required to create/manage gates, but kept for display + purchase-preview.
 */
export const ACCESS_GATE_PLATFORM_CONFIG_ID: Record<SuiNetwork, string> = {
  testnet: '0x7c5aed0ce7f29a4dfb60657858df31c12410a67098b4bcdd1d8cb1e531be4884',
  mainnet: '', // populated on mainnet deploy
}

/**
 * Fully-qualified NFT type minted by a gate, for the given soulbound flag. Derived from the
 * hardcoded package ID — no separate configuration needed.
 */
export function accessGateNftType(network: SuiNetwork, soulbound: boolean): string {
  const variant = soulbound ? 'SoulboundAccessNFT' : 'AccessNFT'
  return `${ACCESS_GATE_PACKAGE_ID[network]}::access_gate::${variant}`
}

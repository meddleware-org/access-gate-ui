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
  testnet: '0x1a81ca177db039585e575beeeee4759466e55910e936a6733e38dbb65025eea4',
  mainnet: '', // populated on mainnet deploy
}

/**
 * Meddleware's `PlatformConfig` shared object IDs per network: the commission terms, the minimum
 * paid price and the free-gate fee. Read by gate creation, set-price, airdrop and freeze.
 */
export const ACCESS_GATE_PLATFORM_CONFIG_ID: Record<SuiNetwork, string> = {
  testnet: '0xe3b949cabe9a0574c03dfc924fb3f96e6f959f2bb86d053ed6229a241c3a23f7',
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

/** A canonical Sui package/object id: `0x` followed by exactly 64 lowercase hex digits. */
const PACKAGE_ID_RE = /^0x[0-9a-f]{64}$/

/**
 * True iff `id` is a canonically-formatted Sui package id (`0x` + 64 lowercase hex). Empty or
 * malformed ids (e.g. the not-yet-populated `mainnet` constants) return `false`.
 */
export function validatePackageId(id: string): boolean {
  return PACKAGE_ID_RE.test(id)
}

/**
 * Fail-closed diagnostic run at app init. The app already fails closed when a package id is empty
 * (it produces an unusable `::access_gate::…` type string that no on-chain call will accept); this
 * surfaces *why* with a clear console warning instead of a silent malformed request. It never
 * throws — a mis-set network should degrade to "nothing works, here's the reason", not a white
 * screen.
 */
export function warnIfPackageConfigInvalid(network: SuiNetwork): void {
  const pkg = ACCESS_GATE_PACKAGE_ID[network]
  const cfg = ACCESS_GATE_PLATFORM_CONFIG_ID[network]
  if (!validatePackageId(pkg)) {
    console.warn(
      `[access-gate-ui] ACCESS_GATE_PACKAGE_ID for network "${network}" is not a valid package id ` +
        `(${pkg === '' ? 'empty — not yet deployed' : `got "${pkg}"`}). Gate reads/writes will fail ` +
        `closed until constants.ts is populated with the deployed package id.`,
    )
  }
  if (!validatePackageId(cfg)) {
    console.warn(
      `[access-gate-ui] ACCESS_GATE_PLATFORM_CONFIG_ID for network "${network}" is not a valid ` +
        `object id (${cfg === '' ? 'empty — not yet deployed' : `got "${cfg}"`}). Purchase-preview ` +
        `and commission display will be unavailable until it is populated.`,
    )
  }
}

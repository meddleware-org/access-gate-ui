// The operator's gate-price policy (no RPC). Converting SUI and MIST is `@meddleware/web-utils`.
import { mistToSui } from '@meddleware/web-utils'

/**
 * Check a gate price against the operator policy. Returns an error message, or `null` if allowed.
 * `0` is a free gate (allowed only if `allowFree`); any other price must be ≥ `minMist`.
 */
export function gatePriceError(priceMist: bigint, minMist: bigint, allowFree: boolean): string | null {
  if (priceMist === 0n) return allowFree ? null : 'Free gates are disabled on this deployment.'
  if (priceMist < minMist) {
    return `The minimum price for a paid gate is ${mistToSui(minMist)} SUI (${minMist} MIST).`
  }
  return null
}

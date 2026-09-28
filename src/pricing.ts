// Pure gate-price rules (no RPC): converts SUI input to MIST and checks it against the operator's
// minimum-price configuration. The live commission lookup lives in gates.ts.

/**
 * Convert a decimal SUI amount to a MIST bigint (1 SUI = 1e9 MIST). Strings are parsed exactly (no
 * float rounding); numbers (Vue's `v-model` casts `type="number"` inputs) go through `toFixed(9)`,
 * which also avoids exponent forms such as `5e-7`.
 */
export function suiToMist(sui: string | number): bigint {
  if (typeof sui === 'number') {
    if (!Number.isFinite(sui) || sui < 0) throw new Error('Invalid price.')
    sui = sui.toFixed(9)
  }
  const m = /^\s*(\d*)(?:\.(\d*))?\s*$/.exec(sui)
  if (!m || (m[1] === '' && (m[2] ?? '') === '')) throw new Error('Invalid price.')
  const frac = m[2] ?? ''
  if (frac.length > 9) throw new Error('Price has more than 9 decimal places (1 MIST = 0.000000001 SUI).')
  return BigInt(m[1] || '0') * 1_000_000_000n + BigInt(frac.padEnd(9, '0') || '0')
}

/** Format MIST as a trimmed decimal SUI string (e.g. `500n` → `0.0000005`). */
export function mistToSui(mist: bigint): string {
  const whole = mist / 1_000_000_000n
  const frac = (mist % 1_000_000_000n).toString().padStart(9, '0').replace(/0+$/, '')
  return frac ? `${whole}.${frac}` : whole.toString()
}

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

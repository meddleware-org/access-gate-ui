import { describe, it, expect } from 'vitest'
import { gatePriceError, mistToSui, suiToMist } from '../src/pricing.js'
import { envFlag, parseMinPrice } from '../src/config.js'

describe('suiToMist / mistToSui', () => {
  it('parses decimal strings exactly', () => {
    expect(suiToMist('0')).toBe(0n)
    expect(suiToMist('1')).toBe(1_000_000_000n)
    expect(suiToMist('0.0000005')).toBe(500n)
    expect(suiToMist('.5')).toBe(500_000_000n)
    expect(suiToMist('12.000000001')).toBe(12_000_000_001n)
  })

  it('accepts numbers from a type="number" v-model, including exponent-sized values', () => {
    expect(suiToMist(0.0000005)).toBe(500n) // String(0.0000005) === '5e-7'
    expect(suiToMist(2.5)).toBe(2_500_000_000n)
  })

  it('rejects invalid, negative and sub-MIST input', () => {
    for (const bad of ['', 'abc', '-1', '1.2.3', '0.0000000001']) expect(() => suiToMist(bad)).toThrow()
    expect(() => suiToMist(-1)).toThrow()
    expect(() => suiToMist(Number.NaN)).toThrow()
  })

  it('formats MIST as trimmed SUI', () => {
    expect(mistToSui(500n)).toBe('0.0000005')
    expect(mistToSui(1_500_000_000n)).toBe('1.5')
    expect(mistToSui(0n)).toBe('0')
  })
})

describe('gatePriceError', () => {
  it('allows free gates only when enabled', () => {
    expect(gatePriceError(0n, 500n, true)).toBeNull()
    expect(gatePriceError(0n, 500n, false)).toMatch(/Free gates are disabled/)
  })

  it('enforces the minimum on non-zero prices', () => {
    expect(gatePriceError(499n, 500n, true)).toMatch(/minimum price is 0.0000005 SUI/)
    expect(gatePriceError(500n, 500n, true)).toBeNull()
    expect(gatePriceError(1n, 0n, true)).toBeNull()
  })
})

describe('operator config parsing', () => {
  it('envFlag reads common truthy spellings and falls back when unset', () => {
    for (const v of ['true', 'TRUE', '1', 'yes', 'on']) expect(envFlag(v)).toBe(true)
    for (const v of ['false', '0', 'no', 'off', 'nope']) expect(envFlag(v, true)).toBe(false)
    expect(envFlag(undefined, true)).toBe(true)
    expect(envFlag('  ', false)).toBe(false)
  })

  it('parseMinPrice: auto by default, fixed for integers', () => {
    expect(parseMinPrice(undefined)).toEqual({ kind: 'auto' })
    expect(parseMinPrice('auto')).toEqual({ kind: 'auto' })
    expect(parseMinPrice('garbage')).toEqual({ kind: 'auto' })
    expect(parseMinPrice('0')).toEqual({ kind: 'fixed', mist: 0n })
    expect(parseMinPrice(' 1000 ')).toEqual({ kind: 'fixed', mist: 1000n })
  })
})

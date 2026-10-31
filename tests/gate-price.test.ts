import { describe, it, expect } from 'vitest'
import { gatePriceError } from '../src/gate-price.js'
import { envFlag, parseMinPrice } from '../src/config.js'

describe('gatePriceError', () => {
  it('allows free gates only when enabled', () => {
    expect(gatePriceError(0n, 500n, true)).toBeNull()
    expect(gatePriceError(0n, 500n, false)).toMatch(/Free gates are disabled/)
  })

  it('enforces the minimum on non-zero prices', () => {
    expect(gatePriceError(499n, 500n, true)).toMatch(/minimum price for a paid gate is 0.0000005 SUI/)
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

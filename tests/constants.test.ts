import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  validatePackageId,
  warnIfPackageConfigInvalid,
  ACCESS_GATE_PACKAGE_ID,
  accessGateNftType,
} from '../src/constants'

const VALID = '0x0bedd0b27d993d3292ca6a5315f7562de8bc0ff3752b445b4c53252c76f2d20d'

describe('validatePackageId', () => {
  it('accepts a canonical 0x + 64-lowercase-hex id', () => {
    expect(validatePackageId(VALID)).toBe(true)
  })

  it('rejects the empty string (not-yet-deployed mainnet constant)', () => {
    expect(validatePackageId('')).toBe(false)
    // The shipped mainnet constant is empty until deploy — must fail closed.
    expect(validatePackageId(ACCESS_GATE_PACKAGE_ID.mainnet)).toBe(false)
  })

  it('rejects a too-short id', () => {
    expect(validatePackageId('0x0bedd0')).toBe(false)
  })

  it('rejects a too-long id', () => {
    expect(validatePackageId(VALID + 'ab')).toBe(false)
  })

  it('rejects uppercase hex (non-canonical)', () => {
    expect(validatePackageId('0x' + 'A'.repeat(64))).toBe(false)
  })

  it('rejects a missing 0x prefix', () => {
    expect(validatePackageId('0'.repeat(64))).toBe(false)
  })

  it('accepts the shipped testnet constant', () => {
    expect(validatePackageId(ACCESS_GATE_PACKAGE_ID.testnet)).toBe(true)
  })
})

describe('warnIfPackageConfigInvalid', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not warn for a fully-configured network (testnet)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    warnIfPackageConfigInvalid('testnet')
    expect(warn).not.toHaveBeenCalled()
  })

  it('warns (but does not throw) for an unconfigured network (mainnet, empty ids)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(() => warnIfPackageConfigInvalid('mainnet')).not.toThrow()
    expect(warn).toHaveBeenCalled()
  })
})

describe('accessGateNftType', () => {
  it('derives the NFT type from the package id', () => {
    expect(accessGateNftType('testnet', false)).toBe(`${VALID}::access_gate::AccessNFT`)
    expect(accessGateNftType('testnet', true)).toBe(`${VALID}::access_gate::SoulboundAccessNFT`)
  })
})

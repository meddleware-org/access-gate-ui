import { describe, it, expect, vi } from 'vitest'
import { ACCESS_GATE_ABORTS, DEFAULT_GATE_POLICY, abortMessage } from '@meddleware/access-gate-client'
import { accessGateDeployment } from '@meddleware/access-gate-client/deployments'

vi.mock('@meddleware/wallet-adapter', () => ({ useNetwork: () => ({ network: { value: 'testnet' } }) }))

import { GATE_POLICY, GATE_POLICY_ERROR, gatePolicyError } from '../src/config.js'

const policy = (over: Partial<typeof DEFAULT_GATE_POLICY>) => ({ ...DEFAULT_GATE_POLICY, ...over })

describe('gatePolicyError', () => {
  it('accepts the unrestricted default and the build default', () => {
    expect(gatePolicyError(DEFAULT_GATE_POLICY)).toBeNull()
    expect(GATE_POLICY_ERROR).toBeNull()
    expect(gatePolicyError(GATE_POLICY)).toBeNull()
  })

  it('rejects pause-blocks-access without freeze-requires-unpaused, naming the rule', () => {
    const msg = gatePolicyError(policy({ pauseBlocksAccess: true }))
    expect(msg).toContain('E_POLICY_COMBINATION')
    expect(msg).toMatch(/^Invalid gate configuration/)
  })

  it('rejects pause-blocks-decryption without freeze-requires-unpaused', () => {
    expect(gatePolicyError(policy({ pauseBlocksDecryption: true }))).toContain('E_POLICY_COMBINATION')
  })

  it('accepts the blocking flags once freezing requires an unpaused gate', () => {
    expect(
      gatePolicyError(policy({ pauseBlocksAccess: true, pauseBlocksDecryption: true, freezeRequiresUnpaused: true })),
    ).toBeNull()
  })

  it('does not constrain the commission lock', () => {
    expect(gatePolicyError(policy({ lockCommissionOnFreeze: true }))).toBeNull()
  })
})

describe('abort messages for the republished contract', () => {
  const abort = (code: number) => ({
    error: {
      $kind: 'MoveAbort',
      message: 'x',
      MoveAbort: { abortCode: String(code), location: { package: accessGateDeployment('testnet').originalId, module: 'access_gate' } },
    },
  })

  it.each([15, 16])('names code %i', (code) => {
    expect(ACCESS_GATE_ABORTS[code]).toBeDefined()
    expect(abortMessage(abort(code), accessGateDeployment('testnet').originalId)).toBe(ACCESS_GATE_ABORTS[code]!.message)
  })
})

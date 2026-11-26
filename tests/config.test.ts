// The build configuration (src/config.ts): the gate-policy check that refuses combinations the contract would abort, the shared explorer network, and the
// abort messages the client names for the republished contract.
import { describe, it, expect, vi } from 'vitest'
import { ACCESS_GATE_ABORTS, DEFAULT_GATE_POLICY, abortMessage } from '@meddleware/access-gate-client'
import { accessGateDeployment } from '@meddleware/access-gate-client/deployments'

// The explorer network the shell exposes, as a stand-in for wallet-adapter's, so the test can check it is passed through and not copied.
const { explorer } = vi.hoisted(() => ({ explorer: { value: 'testnet' } }))
vi.mock('@meddleware/wallet-adapter', () => ({ useNetwork: () => ({ network: { value: 'testnet' }, explorerNetwork: explorer }) }))

import { GATE_POLICY, GATE_POLICY_ERROR, explorerNetwork, gatePolicyCause, gatePolicyError } from '../src/config.js'

// policy(over): the default policy with some flags changed.
const policy = (over: Partial<typeof DEFAULT_GATE_POLICY>) => ({ ...DEFAULT_GATE_POLICY, ...over })

// What a person is told (and what only the developer sees) for each policy combination.
describe('gatePolicyError', () => {
  it('accepts the unrestricted default and the build default', () => {
    expect(gatePolicyError(DEFAULT_GATE_POLICY)).toBeNull()
    expect(GATE_POLICY_ERROR).toBeNull()
    expect(gatePolicyError(GATE_POLICY)).toBeNull()
  })

  it('rejects pause-blocks-access without freeze-requires-unpaused, telling a person only that it is unavailable', () => {
    const msg = gatePolicyError(policy({ pauseBlocksAccess: true }))!
    expect(msg).toMatch(/^Creating gates is unavailable/)
    expect(msg).not.toMatch(/VITE_|E_POLICY|freezeRequiresUnpaused|operator/i)
  })

  it('names the broken rule for the developer', () => {
    expect(gatePolicyCause(policy({ pauseBlocksAccess: true }))).toContain('E_POLICY_COMBINATION')
    expect(gatePolicyCause(policy({ pauseBlocksDecryption: true }))).toContain('E_POLICY_COMBINATION')
    expect(gatePolicyCause(DEFAULT_GATE_POLICY)).toBeNull()
  })

  it('rejects pause-blocks-decryption without freeze-requires-unpaused', () => {
    expect(gatePolicyError(policy({ pauseBlocksDecryption: true }))).not.toBeNull()
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

// The explorer network is wallet-adapter's own.
describe('explorerNetwork', () => {
  it("is wallet-adapter's, not a local copy", () => {
    expect(explorerNetwork).toBe(explorer)
  })
})

// The two abort codes the republished contract added have messages.
describe('abort messages for the republished contract', () => {
  // abort(code): a Move abort error from the access_gate module.
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

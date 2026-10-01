import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ACCESS_GATE_ABORTS } from '@meddleware/access-gate-client'
import { accessGateDeployment } from '@meddleware/access-gate-client/deployments'

// The wallet is mocked; @meddleware/access-gate-client and the deployment are real.
const { executor, networkRef } = vi.hoisted(() => ({
  executor: { signAndExecute: vi.fn(), waitForTransaction: vi.fn() },
  networkRef: { value: 'testnet' },
}))
vi.mock('../src/wallet.js', () => ({ buildExecutor: async () => executor, getSuiClient: () => ({}) }))
vi.mock('@meddleware/wallet-adapter', () => ({ useNetwork: () => ({ network: networkRef }) }))

import { adminContext, buildNewGateTx, errorMessage, executeTx } from '../src/gates.js'

const testnet = accessGateDeployment('testnet')
const gate = { gateId: '0x' + 'aa'.repeat(32), adminCapId: '0x' + 'bb'.repeat(32) } as never

beforeEach(() => {
  executor.signAndExecute.mockReset()
  executor.waitForTransaction.mockReset()
  networkRef.value = 'testnet'
})

describe('deployment ids', () => {
  it('builds admin calls at the latest package with the recorded PlatformConfig', () => {
    expect(adminContext(gate)).toMatchObject({ packageId: testnet.publishedAt, platformConfigId: testnet.platformConfigId })
  })

  it('refuses to build on a network without a deployment', () => {
    networkRef.value = 'mainnet'
    expect(() =>
      buildNewGateTx({
        priceMist: 10_000_000n, paymentRecipient: '0x1', defaultUses: 0n, soulbound: false, autoBurnAtZero: false,
        nftName: 'n', nftImageUrl: '', nftDescription: 'd',
      }),
    ).toThrow(/no access_gate deployment recorded for mainnet/)
  })
})

describe('executeTx', () => {
  it('returns the digest once the transaction is confirmed', async () => {
    executor.signAndExecute.mockResolvedValue({ digest: 'D1', success: true, result: { $kind: 'Transaction' } })
    executor.waitForTransaction.mockResolvedValue({})
    expect(await executeTx({} as never)).toBe('D1')
    expect(executor.signAndExecute).toHaveBeenCalledWith({}, { include: {} })
  })

  it('names the access_gate abort of a failed transaction', async () => {
    const status = {
      success: false,
      error: { $kind: 'MoveAbort', message: 'x', MoveAbort: { abortCode: '11', location: { package: testnet.originalId, module: 'access_gate' } } },
    }
    executor.signAndExecute.mockResolvedValue({ digest: 'D2', success: false, result: { $kind: 'FailedTransaction', FailedTransaction: { status } } })
    const err = await executeTx({} as never).catch((e) => e)
    expect(errorMessage(err)).toBe(ACCESS_GATE_ABORTS[11].message)
    expect(executor.waitForTransaction).not.toHaveBeenCalled()
  })

  it('surfaces a confirmation failure instead of reporting success', async () => {
    executor.signAndExecute.mockResolvedValue({ digest: 'D3', success: true, result: { $kind: 'Transaction' } })
    executor.waitForTransaction.mockRejectedValue(new Error('timeout'))
    await expect(executeTx({} as never)).rejects.toThrow(/D3 was submitted but could not be confirmed \(timeout\)/)
  })

  it('falls back to the error\'s own message', () => {
    expect(errorMessage(new Error('User rejected'))).toBe('User rejected')
  })
})

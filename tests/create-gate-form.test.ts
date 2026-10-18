import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// Stub @meddleware/ui (its prebuilt dist doesn't render under a second Vue runtime in tests).
vi.mock('@meddleware/ui', () => ({
  UiCard: { name: 'UiCard', template: '<div><slot /></div>' },
  UiStepper: { name: 'UiStepper', props: ['steps', 'modelValue'], template: '<div />' },
  UiButton: {
    name: 'UiButton',
    props: ['variant', 'disabled', 'type'],
    emits: ['click'],
    template: '<button :type="type || \'button\'" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
  },
  UiNotice: { name: 'UiNotice', props: ['type'], template: '<div class="notice"><slot /></div>' },
}))

// The configuration is mocked so the invalid-combination path can be exercised; the other seams
// (platform read, tx build, wallet) are mocked to assert that nothing reaches the wallet.
const { config, buildNewGateTx, executeTx, getPlatformConfig } = vi.hoisted(() => ({
  config: { error: null as string | null },
  buildNewGateTx: vi.fn(() => ({ kind: 'create' })),
  executeTx: vi.fn(async () => '0xdigest'),
  getPlatformConfig: vi.fn(async () => ({ minCommissionMist: 1_000_000n, freeGateFeeMist: 0n })),
}))
vi.mock('../src/config.js', () => ({
  GATE_ALLOW_FREE: true,
  GATE_POLICY: { freezeRequiresUnpaused: false, lockCommissionOnFreeze: false, pauseBlocksDecryption: false, pauseBlocksAccess: true },
  get GATE_POLICY_ERROR() {
    return config.error
  },
}))
vi.mock('../src/gates.js', () => ({
  buildNewGateTx,
  executeTx,
  getPlatformConfig,
  minimumGatePriceMist: () => 10_000_000n,
  errorMessage: (e: unknown) => (e instanceof Error ? e.message : String(e)),
}))

import CreateGateForm from '../src/components/CreateGateForm.vue'

const INVALID = 'Invalid gate configuration (E_POLICY_COMBINATION): pause blocks access requires freezeRequiresUnpaused'

async function toLastStep(w: ReturnType<typeof mount>): Promise<void> {
  for (const label of ['Next', 'Next']) {
    await w.findAll('button').find((b) => b.text() === label)!.trigger('click')
  }
}

beforeEach(() => {
  config.error = null
  buildNewGateTx.mockClear()
  executeTx.mockClear()
})

describe('CreateGateForm with an invalid configured policy (F12)', () => {
  it('disables Create and builds nothing when the configuration is invalid', async () => {
    config.error = INVALID
    const w = mount(CreateGateForm, { props: { address: '0xabc' } })
    await flushPromises()
    await toLastStep(w)
    const create = w.findAll('button').find((b) => b.text() === 'Create gate')!
    expect(create.attributes('disabled')).toBeDefined()
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(w.text()).toContain('E_POLICY_COMBINATION')
    expect(buildNewGateTx).not.toHaveBeenCalled()
    expect(executeTx).not.toHaveBeenCalled()
  })

  it('leaves Create enabled for a valid configuration', async () => {
    const w = mount(CreateGateForm, { props: { address: '0xabc' } })
    await flushPromises()
    await toLastStep(w)
    const create = w.findAll('button').find((b) => b.text() === 'Create gate')!
    expect(create.attributes('disabled')).toBeUndefined()
  })
})

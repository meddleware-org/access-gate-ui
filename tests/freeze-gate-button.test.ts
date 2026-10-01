import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// Stub @meddleware/ui (its prebuilt dist doesn't render under a second Vue runtime in tests) with
// minimal components that forward the props we assert on: UiButton must forward `disabled` + click.
vi.mock('@meddleware/ui', () => ({
  // Re-emit the native click as the component's `click` event so the parent's `@click` fires.
  UiButton: {
    name: 'UiButton',
    props: ['variant', 'disabled'],
    emits: ['click'],
    template: '<button :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
  },
  UiNotice: { name: 'UiNotice', props: ['type'], template: '<div class="notice"><slot /></div>' },
}))

// The PTB builder + wallet executor are library/wallet seams — mock them so we assert wiring only.
// vi.hoisted makes these available inside the hoisted vi.mock factories.
const { executeTx, adminContext, buildMakeGateImmutableTx } = vi.hoisted(() => ({
  executeTx: vi.fn(async () => ({ digest: '0xok' })),
  adminContext: vi.fn((gate: unknown) => ({ gate })),
  buildMakeGateImmutableTx: vi.fn((ctx: unknown) => ({ kind: 'make-immutable', ctx })),
}))
vi.mock('../src/gates.js', () => ({ executeTx, adminContext, errorMessage: (e: unknown) => (e instanceof Error ? e.message : String(e)) }))
vi.mock('@meddleware/access-gate-client', () => ({ buildMakeGateImmutableTx }))

import FreezeGateButton from '../src/components/FreezeGateButton.vue'

const gate = { gateId: '0xgate' } as never

function findButton(w: ReturnType<typeof mount>, text: string) {
  return w.findAll('button').find((b) => b.text().includes(text))!
}

beforeEach(() => {
  executeTx.mockClear()
  adminContext.mockClear()
  buildMakeGateImmutableTx.mockClear()
})

describe('FreezeGateButton (fail-closed confirmation)', () => {
  it('reveals the typed confirmation only after clicking Freeze', async () => {
    const w = mount(FreezeGateButton, { props: { gate } })
    expect(w.find('input').exists()).toBe(false)
    await findButton(w, 'Freeze gate').trigger('click')
    expect(w.find('input').exists()).toBe(true)
  })

  it('keeps Confirm disabled until exactly FREEZE is typed', async () => {
    const w = mount(FreezeGateButton, { props: { gate } })
    await findButton(w, 'Freeze gate').trigger('click')
    const confirm = () => findButton(w, 'Confirm freeze')
    expect(confirm().attributes('disabled')).toBeDefined()
    await w.find('input').setValue('freeze') // wrong case
    expect(confirm().attributes('disabled')).toBeDefined()
    await w.find('input').setValue('FREEZE')
    expect(confirm().attributes('disabled')).toBeUndefined()
  })

  it('Cancel resets the confirmation state', async () => {
    const w = mount(FreezeGateButton, { props: { gate } })
    await findButton(w, 'Freeze gate').trigger('click')
    await findButton(w, 'Cancel').trigger('click')
    expect(w.find('input').exists()).toBe(false)
  })

  it('on confirm, builds the immutable PTB from the gate and emits changed', async () => {
    const w = mount(FreezeGateButton, { props: { gate } })
    await findButton(w, 'Freeze gate').trigger('click')
    await w.find('input').setValue('FREEZE')
    await findButton(w, 'Confirm freeze').trigger('click')
    await flushPromises()
    expect(adminContext).toHaveBeenCalledWith(gate)
    expect(buildMakeGateImmutableTx).toHaveBeenCalledWith({ gate })
    expect(executeTx).toHaveBeenCalledWith({ kind: 'make-immutable', ctx: { gate } })
    expect(w.emitted('changed')).toBeTruthy()
  })

  it('does not execute while the phrase is wrong (Confirm stays disabled)', async () => {
    const w = mount(FreezeGateButton, { props: { gate } })
    await findButton(w, 'Freeze gate').trigger('click')
    await w.find('input').setValue('nope')
    // The disabled button cannot be activated; a trigger is a no-op → fail closed.
    await findButton(w, 'Confirm freeze').trigger('click')
    await flushPromises()
    expect(executeTx).not.toHaveBeenCalled()
    expect(w.emitted('changed')).toBeFalsy()
  })

  it('explains instead of offering Freeze when the policy forbids freezing a paused gate', () => {
    const paused = { gateId: '0xgate', paused: true, policy: { freezeRequiresUnpaused: true } } as never
    const w = mount(FreezeGateButton, { props: { gate: paused } })
    expect(w.text()).toContain("can't be frozen while paused")
    expect(w.findAll('button').some((b) => b.text().includes('Freeze gate'))).toBe(false)
  })

  it('still offers Freeze for a paused gate without that restriction', () => {
    const paused = { gateId: '0xgate', paused: true, policy: { freezeRequiresUnpaused: false } } as never
    const w = mount(FreezeGateButton, { props: { gate: paused } })
    expect(findButton(w, 'Freeze gate').exists()).toBe(true)
  })
})

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// Stub the @meddleware/ui components (its prebuilt dist doesn't render under a second Vue runtime in
// tests); keep the real safeHref, which is a plain function.
vi.mock('@meddleware/ui', async () => {
  const actual = await vi.importActual<typeof import('@meddleware/ui')>('@meddleware/ui')
  return {
    safeHref: actual.safeHref,
    UiCard: { name: 'UiCard', template: '<div><slot /></div>' },
    UiButton: { name: 'UiButton', props: ['variant'], emits: ['click'], template: '<button @click="$emit(\'click\')"><slot /></button>' },
    UiNotice: { name: 'UiNotice', props: ['type'], template: '<div><slot /></div>' },
  }
})

import GateCard from '../src/components/GateCard.vue'

const gate = (gateId: string, priceMist = 0n) =>
  ({
    gateId, adminCapId: '0xcap', priceMist, paymentRecipient: '0xr', defaultUses: 0n, soulbound: false,
    autoBurnAtZero: false, paused: false, frozen: false, nftName: 'Pass', nftImageUrl: '', nftDescription: '',
  }) as never

const sealLink = (gateId: string) =>
  mount(GateCard, {
    props: { gate: gate(gateId) },
    global: { stubs: { GateSettingsPanel: true, AirdropForm: true, FreezeGateButton: true } },
  }).find('a.seal-link').attributes('href')

describe('GateCard seal link', () => {
  it('opens seal-ui on this gate', () => {
    const id = '0x' + 'ab'.repeat(32)
    expect(sealLink(id)).toBe(`https://sui-seal.meddleware.co.uk/?gate=${id}`)
  })

  it('encodes the gate id, so it cannot add query parameters or change the path', () => {
    expect(sealLink('0x1&next=//evil#x')).toBe('https://sui-seal.meddleware.co.uk/?gate=0x1%26next%3D%2F%2Fevil%23x')
  })
})

describe('GateCard price', () => {
  const badge = (priceMist: bigint) =>
    mount(GateCard, {
      props: { gate: gate('0x1', priceMist) },
      global: { stubs: { GateSettingsPanel: true, AirdropForm: true, FreezeGateButton: true } },
    }).find('.badge').text()

  it('shows the exact price, without exponent forms or float rounding', () => {
    expect(badge(0n)).toBe('Free')
    expect(badge(100n)).toBe('0.0000001 SUI')
    expect(badge(9_007_199_254_740_993n)).toBe('9007199.254740993 SUI')
  })
})

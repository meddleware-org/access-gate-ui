// The settings are a list: one item per setting, each with its field and its own Update button.
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('../src/gates.js', () => ({
  adminContext: () => ({}),
  buildPriceChangeTx: vi.fn(),
  executeTx: vi.fn(),
  errorMessage: (e: unknown) => String(e),
}))

import GateSettingsPanel from '../src/components/GateSettingsPanel.vue'

const gate = (defaultUses: bigint) =>
  ({
    gateId: '0x1', adminCapId: '0xcap', priceMist: 1_000_000_000n, paymentRecipient: '0xr', defaultUses, soulbound: false,
    autoBurnAtZero: false, paused: false, frozen: false, freeFeePaid: false, nftName: 'Pass', nftImageUrl: '', nftDescription: '',
  }) as never

describe('GateSettingsPanel', () => {
  it('lists one setting per item, each with its own Update button', () => {
    const w = mount(GateSettingsPanel, { props: { gate: gate(0n) } })
    const items = w.findAll('ul.rows > li')
    expect(items.map((li) => li.find('label').text())).toEqual(['Price (SUI)', 'Payment recipient', 'NFT name', 'NFT image URL', 'NFT description'])
    for (const li of items) expect(li.findAll('button').map((b) => b.text())).toEqual(['Update'])
  })

  it('adds the default credits for a single-use gate', () => {
    const w = mount(GateSettingsPanel, { props: { gate: gate(3n) } })
    expect(w.findAll('ul.rows > li label').map((l) => l.text())).toContain('Default credits')
  })
})

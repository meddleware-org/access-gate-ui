// The standalone shell is the shared tool shell: the tool's name as brand and page heading, the wallet control in the header,
// the documentation links and the copyright in the footer.
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const { account } = await vi.hoisted(async () => ({ account: (await import('vue')).ref<{ address: string } | null>(null) }))
vi.mock('../src/wallet.js', () => ({ useWallet: () => ({ account, disconnect: vi.fn() }) }))
vi.mock('../src/components/AccessGateView.vue', () => ({ default: { template: '<p class="view">view</p>' } }))
vi.mock('@meddleware/wallet-adapter', () => ({ WalletModal: { template: '<button class="wallet">Connect wallet</button>' } }))
vi.mock('../src/config.js', () => ({ explorerNetwork: { value: 'testnet' } }))

import App from '../src/App.vue'

describe('App', () => {
  it('is the tool shell around the view', () => {
    const w = mount(App)
    expect(w.find('h1').text()).toBe('Access Gate')
    expect(w.find('.view').exists()).toBe(true)
    expect(w.find('header .wallet').exists()).toBe(true)
    const hrefs = w.findAll('footer a').map((a) => a.attributes('href'))
    expect(hrefs).toContain('https://docs.meddleware.co.uk/blockchain/sui/access-gate/')
    expect(hrefs).toContain('https://meddleware.dev/sui/access-gate/')
    expect(w.find('footer').text()).toContain('Meddleware')
  })

  it('shows the connected address and a way to disconnect in the header', () => {
    account.value = { address: '0x' + 'ab'.repeat(32) }
    const w = mount(App)
    expect(w.find('header .wallet').exists()).toBe(false)
    expect(w.find('header').text()).toContain('Disconnect')
    account.value = null
  })
})

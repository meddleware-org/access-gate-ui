// The shared accessibility sweep (WCAG 2.2 AA and AAA in every colour mode × season, reflow, text size, forced colours, reduced motion,
// keyboard) over the screens a visitor meets: disconnected, the wallet dialog, every step of creating a gate, the list, a gate being
// managed and the freeze confirmation. The e2e build's mock wallet and stub chain make the connected ones reachable.
import { defineA11ySuite } from '@meddleware/frontend-config/a11y'
import { freezing, managing, open } from './open.js'

defineA11ySuite(
  {
    disconnected: open(),
    'wallet dialog': async (page) => {
      await open()(page)
      await page.getByRole('button', { name: 'Connect wallet' }).first().click()
      await page.getByRole('dialog', { name: 'Select wallet' }).waitFor()
    },
    'create: economics': open({ connected: true }),
    'create: appearance': async (page) => {
      await open({ connected: true })(page)
      await page.getByRole('button', { name: 'Next' }).click()
      await page.getByLabel('NFT name').waitFor()
    },
    'create: options': async (page) => {
      await open({ connected: true })(page)
      await page.getByRole('button', { name: 'Next' }).click()
      await page.getByRole('button', { name: 'Next' }).click()
      await page.getByRole('button', { name: 'Create gate' }).waitFor()
    },
    'my gates': open({ connected: true, tab: 'My gates' }),
    managing,
    'freeze confirmation': freezing,
  },
  { aaa: 'gate' },
)


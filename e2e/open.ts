import type { Page } from '@playwright/test'
import { offline } from '@meddleware/frontend-config/look'
import { connectMockWallet } from '@meddleware/frontend-config/wallet'

/**
 * The built app (the e2e build: a mock wallet and a stub chain with two gates), every request that leaves localhost refused.
 * `connected` goes through the app's own wallet dialog as a visitor would.
 */
export const open = (options: { connected?: boolean; tab?: 'Create gate' | 'My gates' } = {}) => async (page: Page) => {
  await offline(page)
  await page.goto('/')
  await page.getByRole('heading', { level: 2, name: 'Access Gate' }).waitFor()
  if (options.connected) {
    await connectMockWallet(page)
    await page.getByRole('heading', { level: 3, name: 'Create a gate' }).waitFor()
  }
  if (options.tab === 'My gates') {
    await page.getByRole('tab', { name: 'My gates', exact: true }).click()
    await page.getByRole('heading', { level: 3, name: 'Studio pass' }).waitFor()
  }
}

/** My gates with the first gate's management open. */
export const managing = async (page: Page) => {
  await open({ connected: true, tab: 'My gates' })(page)
  await page.getByText('Manage', { exact: true }).first().click()
  await page.getByRole('button', { name: 'Freeze gate (irreversible)' }).waitFor()
}

/** The freeze confirmation dialog, open. */
export const freezing = async (page: Page) => {
  await managing(page)
  await page.getByRole('button', { name: 'Freeze gate (irreversible)' }).click()
  await page.getByRole('dialog', { name: 'Freeze this gate?' }).waitFor()
}

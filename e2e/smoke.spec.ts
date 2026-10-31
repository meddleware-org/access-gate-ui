// Smoke test of the BUILT app (the e2e build, with its mock wallet and stub chain): it mounts, shows its landmarks, connects the mock
// wallet through the app's own dialog, lists the gates, and raises no uncaught error.
import { expect, test } from '@playwright/test'
import { offline } from '@meddleware/frontend-config/look'
import { E2E_ADDRESS, connectMockWallet } from '@meddleware/frontend-config/wallet'

test('mounts, connects the mock wallet and lists the gates, without an uncaught error', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await offline(page)
  await page.goto('/')
  await expect(page.getByRole('banner')).toBeVisible()
  await expect(page.getByRole('main')).toBeVisible()
  await expect(page.getByRole('contentinfo')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Access Gate') // the shell's (the dashboard owns h1 when the view is embedded)
  await expect(page.getByText('Connect a Sui wallet to create and manage your access gates.')).toBeVisible()

  await connectMockWallet(page)
  await expect(page.getByRole('heading', { level: 3, name: 'Create a gate' })).toBeVisible()
  await expect(page.getByText(E2E_ADDRESS.slice(0, 12), { exact: false }).first()).toBeVisible()

  await page.getByRole('tab', { name: 'My gates', exact: true }).click()
  await expect(page.getByRole('heading', { level: 3, name: 'Studio pass' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'Open pass' })).toBeVisible()
  await expect(page.locator('.mw-badge', { hasText: 'Paused' })).toBeVisible()
  expect(errors).toEqual([])
})

test('creating a gate goes through the wallet and shows the transaction', async ({ page }) => {
  await offline(page)
  await page.goto('/')
  await connectMockWallet(page)
  await page.getByLabel('Price (SUI)').fill('0.05')
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByLabel('NFT name').fill('Test pass')
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Create gate' }).click()
  // A created gate takes the person to the list of their gates.
  await expect(page.getByRole('tab', { name: 'My gates', exact: true })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('heading', { level: 3, name: 'Studio pass' })).toBeVisible()
})

test('freezing needs the typed word', async ({ page }) => {
  await offline(page)
  await page.goto('/')
  await connectMockWallet(page)
  await page.getByRole('tab', { name: 'My gates', exact: true }).click()
  const card = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: 'Studio pass' }) })
  await card.getByText('Manage', { exact: true }).click()
  await card.getByRole('button', { name: 'Freeze gate (irreversible)' }).click()
  const word = card.getByLabel('Type FREEZE to confirm')
  const confirm = card.getByRole('button', { name: 'Confirm freeze' })
  await expect(confirm).toBeDisabled()
  await word.fill('freeze')
  await expect(confirm).toBeDisabled()
  await word.fill('FREEZE')
  await expect(confirm).toBeEnabled()
})

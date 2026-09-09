import { expect, stubBackend, test, waitForScreen } from './fixtures'

/**
 * The targets screen has two modes and the captures only ever showed one of
 * them, because the seeded goal is a calculated one. The entered mode is the
 * branch that parses what the user typed — and it threw on render the first
 * time anything asked for a whole number.
 */
test('both target modes render, including the one that parses what you type', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))

  await page.setViewportSize({ width: 375, height: 812 })
  await stubBackend(page, { theme: 'light', locale: 'de' })
  await page.goto('/goals')
  await waitForScreen(page)

  // The seeded goal is calculated, so that branch is on screen first.
  await expect(page.getByText(/in Ruhe/)).toBeVisible()

  await page.getByRole('radio', { name: 'eingetragen' }).click()
  await expect(page.getByRole('textbox', { name: 'kalorien' })).toBeVisible()

  // A whole-number field: the crash was in parsing this one.
  await page.getByRole('textbox', { name: 'kalorien' }).fill('2100')
  await expect(page.getByRole('textbox', { name: 'kalorien' })).toHaveValue('2100')

  expect(errors, 'nothing threw while rendering either mode').toEqual([])
})

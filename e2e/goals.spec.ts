import { expect, stubBackend, test, waitForScreen } from './fixtures'

/**
 * The targets screen has two modes and the captures only ever showed one of
 * them, because the seeded goal is a calculated one. The entered mode is the
 * branch that parses what the user typed, and it threw on render the first
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
  await expect(page.getByRole('textbox', { name: 'kalorien', exact: true })).toBeVisible()

  // A whole-number field: the crash was in parsing this one.
  await page.getByRole('textbox', { name: 'kalorien', exact: true }).fill('2100')
  await expect(page.getByRole('textbox', { name: 'kalorien', exact: true })).toHaveValue('2100')

  expect(errors, 'nothing threw while rendering either mode').toEqual([])
})

test('the macro calculator fills the three fields from the two knobs', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await stubBackend(page, { theme: 'light', locale: 'de' })
  await page.goto('/goals')
  await waitForScreen(page)

  // Defaults are already in the knobs, so this is one tap from a fresh screen.
  await page.getByRole('button', { name: 'Die drei Felder füllen' }).click()

  // 83 kg × 1.8 = 149 g. The seeded goal is 2386 kcal calculated, so fat is
  // 30% of that over 9, and carbohydrate is whatever is left.
  await expect(page.getByRole('textbox', { name: 'eiweiß', exact: true })).toHaveValue('149')
  const fat = Number(await page.getByRole('textbox', { name: 'fett', exact: true }).inputValue())
  const carbs = Number(await page.getByRole('textbox', { name: 'kohlenhydrate', exact: true }).inputValue())
  expect(fat).toBeGreaterThan(0)
  expect(carbs).toBeGreaterThan(0)

  // What it filled in adds back up to the target it was given.
  const energy = 149 * 4 + fat * 9 + carbs * 4
  expect(Math.abs(energy - 2386)).toBeLessThan(20)
})

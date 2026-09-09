import { expect, stubBackend, test, waitForScreen } from './fixtures'

test('the day shows what was done last time for each exercise', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await stubBackend(page, { theme: 'light', locale: 'de' })
  await page.goto('/training')
  await waitForScreen(page)

  // §10.10 calls this the reason anyone opens this tab between sets.
  await expect(page.getByText(/letztes Mal/)).toBeVisible()
  await expect(page.getByText(/2 × 8 @ 60 kg/)).toBeVisible()

  // An exercise never done before says so rather than showing an empty line.
  await expect(page.getByText('zum ersten Mal')).toBeVisible()
})

test('the set form opens on the last set, repeated', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await stubBackend(page, { theme: 'light', locale: 'de' })
  await page.goto('/training')
  await waitForScreen(page)

  // Between sets the answer is almost always "the same again", so the fields
  // are already filled with it.
  await expect(page.getByRole('textbox', { name: 'wdh' }).first()).toHaveValue('8')
  await expect(page.getByRole('textbox', { name: 'gewicht' }).first()).toHaveValue('62,5')
})

test('picking an exercise opens its block with nothing logged in it', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await stubBackend(page, { theme: 'light', locale: 'de' })
  await page.goto('/training/add')
  await waitForScreen(page)

  // Squats are in the catalogue but not in the day, so its block is new.
  await page.getByRole('button', { name: /Kniebeuge/ }).click()
  await expect(page.getByRole('heading', { name: 'Kniebeuge mit Langhantel' })).toBeVisible()
  await expect(page.getByText('zum ersten Mal').first()).toBeVisible()
})

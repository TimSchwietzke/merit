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

test('groups fold and unfold, and a folded group still says how many it holds', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await stubBackend(page, { theme: 'light', locale: 'de' })
  await page.goto('/training/add')
  await waitForScreen(page)

  // Every group starts open. Collapsed by default is the anti-pattern (§17).
  const chest = page.getByRole('button', { name: /^brust/ })
  await expect(chest).toHaveAttribute('aria-expanded', 'true')

  // Scoped to this group's own panel: a recently-used lift appears in both the
  // recents group and its muscle group, which is the point of recents.
  const panel = page.locator(`#${await chest.getAttribute('aria-controls')}`)
  await expect(panel.getByRole('button', { name: /Bankdrücken/ })).toBeVisible()

  await chest.click()
  await expect(chest).toHaveAttribute('aria-expanded', 'false')
  await expect(panel.getByRole('button', { name: /Bankdrücken/ })).toBeHidden()

  // The count survives the fold — it is what says whether to open it again.
  await expect(chest).toContainText('1')
})

test('a filter narrows the catalogue and leaves recently-used alone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await stubBackend(page, { theme: 'light', locale: 'de' })
  await page.goto('/training/add')
  await waitForScreen(page)

  // Nothing is filtered, so there is no way back to offer yet.
  await expect(page.getByRole('button', { name: 'zurücksetzen' })).toHaveCount(0)

  await page.getByRole('button', { name: 'kabel', exact: true }).click()

  // Cable leaves the back group; legs and chest are barbell and go.
  await expect(page.getByRole('button', { name: /^rücken/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^beine/ })).toHaveCount(0)

  // Recently used ignores the facets entirely (§10.11) — the bench press is a
  // barbell lift and is still there.
  const recent = page.getByRole('button', { name: /zuletzt benutzt/ })
  await expect(recent).toBeVisible()
  await expect(recent).toContainText('2')

  await expect(page.getByRole('button', { name: 'zurücksetzen' })).toBeVisible()
})

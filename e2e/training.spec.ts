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

test('a set opens for editing where it stands, carrying its own figures', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await stubBackend(page, { theme: 'light', locale: 'de' })
  await page.goto('/training')
  await waitForScreen(page)

  // No form per exercise any more: the row is the thing you change. Tapping
  // the second bench set opens it with its own reps and weight already in it.
  await page.getByText('8 × 62,5 kg').last().click()

  await expect(page.getByRole('textbox', { name: 'wdh' })).toHaveValue('8')
  await expect(page.getByRole('textbox', { name: 'gewicht' })).toHaveValue('62,5')
})

test('a planned set is faint and unticked until it is done', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await stubBackend(page, { theme: 'light', locale: 'de' })
  await page.goto('/training')
  await waitForScreen(page)

  // The harness seeds one set the routine planned and nobody performed.
  const tick = page.getByRole('button', { name: 'Als erledigt markieren' })
  await expect(tick).toHaveCount(1)
  await expect(tick).toHaveAttribute('aria-pressed', 'false')

  // And the done ones say so, which is what the count in the head reports.
  await expect(page.getByRole('button', { name: 'Als offen markieren' })).toHaveCount(3)
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

  // The count rides on the button, so the state is readable without opening it
  // — the condition §10.11 attaches to putting facets behind a control.
  const filters = page.getByRole('button', { name: 'Filter' })
  await expect(filters).toBeVisible()

  await filters.click()
  await page.getByRole('button', { name: 'kabel', exact: true }).click()
  await page.getByRole('button', { name: 'Schließen' }).click()

  await expect(page.getByRole('button', { name: /Filter, 1 aktiv/ })).toBeVisible()

  // Cable leaves the back group; legs and chest are barbell and go.
  await expect(page.getByRole('button', { name: /^rücken/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^beine/ })).toHaveCount(0)

  // Recently used ignores the facets entirely (§10.11) — the bench press is a
  // barbell lift and is still there.
  const recent = page.getByRole('button', { name: /zuletzt benutzt/ })
  await expect(recent).toBeVisible()
  await expect(recent).toContainText('2')

})

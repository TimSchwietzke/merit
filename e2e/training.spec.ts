import { expect, stubBackend, test, waitForScreen } from './fixtures'

test('the day shows what was done last time for each exercise', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await stubBackend(page, { theme: 'light', locale: 'de' })
  await page.goto('/training/day')
  await waitForScreen(page)

  // §10.10 calls this the reason anyone opens this tab between sets.
  await expect(page.getByText(/letztes Mal/).first()).toBeVisible()
  await expect(page.getByText(/2 × 8 @ 60 kg/)).toBeVisible()

  // An exercise never done before says so rather than showing an empty line.
  await expect(page.getByText('zum ersten Mal')).toBeVisible()
})

test('every figure is editable where it stands, with nothing to open first', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await stubBackend(page, { theme: 'light', locale: 'de' })
  await page.goto('/training/day')
  await waitForScreen(page)

  // No edit mode and no tick: the row is the form. Both bench sets are already
  // fields carrying their own figures.
  await expect(page.getByRole('textbox', { name: 'Bankdrücken wdh 1' })).toHaveValue('8')
  await expect(page.getByRole('textbox', { name: 'Bankdrücken gewicht 1' })).toHaveValue('62,5')
  await expect(page.getByRole('textbox', { name: 'Bankdrücken wdh 2' })).toHaveValue('8')

  // And they take a change without anything being opened.
  const reps = page.getByRole('textbox', { name: 'Bankdrücken wdh 1' })
  await reps.fill('6')
  await expect(reps).toHaveValue('6')
})

test('a new set starts from the one before it, never from zero', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await stubBackend(page, { theme: 'light', locale: 'de' })

  const posted: Record<string, unknown>[] = []
  await page.route('**/rest/v1/workout_sets*', async (route) => {
    if (route.request().method() === 'POST') {
      posted.push(JSON.parse(route.request().postData() ?? '{}'))
      return route.fulfill({ status: 201, contentType: 'application/json', body: '{}' })
    }
    return route.fallback()
  })

  await page.goto('/training/day')
  await waitForScreen(page)
  await page.getByRole('button', { name: 'Satz hinzufügen' }).first().click()
  await expect.poll(() => posted.length).toBeGreaterThan(0)

  // 8 × 62,5 was the last bench set. Zero reps at zero kilos is not a set
  // anybody did, and it is not what the next one should offer.
  expect(posted[0]).toMatchObject({ reps: 8, weight_kg: 62.5 })
})

test('picking an exercise opens its block with nothing logged in it', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await stubBackend(page, { theme: 'light', locale: 'de' })
  await page.goto('/training/add')
  await waitForScreen(page)

  // Squats are in the catalogue and have never been done, so its block is new.
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
  // One option per row, grouped by facet, each carrying what it would leave.
  await page.getByRole('checkbox', { name: /kabel/ }).click()
  await page.getByRole('button', { name: 'Schließen' }).click()

  await expect(page.getByRole('button', { name: /Filter, 1 aktiv/ })).toBeVisible()

  // Cable leaves the back group; legs and chest are barbell and go.
  await expect(page.getByRole('button', { name: /^rücken/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^beine/ })).toHaveCount(0)

  // Recently used ignores the facets entirely (§10.11) — the bench press is a
  // barbell lift and is still there.
  const recent = page.getByRole('button', { name: /zuletzt benutzt/ })
  await expect(recent).toBeVisible()
  await expect(recent).toContainText('3')

})

test('the week strip changes the day below it without leaving the screen', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await stubBackend(page, { theme: 'light', locale: 'de' })
  await page.goto('/training')
  await waitForScreen(page)

  // The tiles are Monday to Sunday whatever day it is, and the fixture plans
  // one routine on Mon/Thu and the other on Tue/Fri — so the week reads the
  // same however long this test outlives the day it was written on.
  const days = page.getByRole('radio')
  // The day's own link, not the routine of the same name further down the
  // screen: the card is the way into the session and says so in its href.
  const card = page.locator('a[href*="/training/session"]')

  await days.nth(0).click()
  await expect(card).toHaveText(/Oberkörper 1/)

  // Wednesday has nothing on it, and saying so is a change in place: the strip
  // exists so that looking at another day is not a navigation.
  await days.nth(2).click()
  await expect(page.getByText('nichts geplant')).toBeVisible()
  expect(new URL(page.url()).pathname).toBe('/training')

  await days.nth(1).click()
  await expect(card).toHaveText(/Unterkörper/)
})

test('a routine with no exercises is listed but never planned into the week', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await stubBackend(page, { theme: 'light', locale: 'de' })
  await page.goto('/training')
  await waitForScreen(page)

  // It is in the list, marked for what it is.
  await expect(page.getByRole('link', { name: /Nacken & Schultern/ })).toBeVisible()
  await expect(page.getByText('noch keine Übungen')).toBeVisible()

  // And its editor will not let it be saved until it holds something.
  await page.getByRole('link', { name: /Nacken & Schultern/ }).click()
  await page.getByRole('radio', { name: /übungen/ }).click()
  await expect(page.getByRole('button', { name: 'Speichern' })).toBeDisabled()
})

test('the editor asks for the name and the days before the exercises', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await stubBackend(page, { theme: 'light', locale: 'de' })
  await page.goto('/training/routines/r3')
  await waitForScreen(page)

  // Step one is what it is called and when it happens. The weekdays are here,
  // not behind a list of exercises somebody has to finish first.
  await expect(page.getByLabel('name')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mo', exact: true })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Übung hinzufügen' })).toBeHidden()

  await page.getByRole('button', { name: /Weiter/ }).click()
  await expect(page.getByRole('button', { name: 'Übung hinzufügen' })).toBeVisible()
  await expect(page.getByLabel('name')).toBeHidden()
})

test('nothing is written until save, and the picker stays open', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await stubBackend(page, { theme: 'light', locale: 'de' })

  const writes: string[] = []
  for (const path of ['**/rest/v1/routines*', '**/rest/v1/routine_days*', '**/rest/v1/rpc/**']) {
    await page.route(path, async (route) => {
      if (route.request().method() !== 'GET') writes.push(route.request().url())
      await route.fallback()
    })
  }

  await page.goto('/training/routines/r1')
  await waitForScreen(page)

  await page.getByLabel('name').fill('Oberkörper 2')
  await page.getByRole('button', { name: 'Mi', exact: true }).click()
  await page.getByRole('button', { name: /Weiter/ }).click()

  // Two picks, one sheet: it does not close under you between them.
  await page.getByRole('button', { name: 'Übung hinzufügen' }).click()
  // Recently used repeats the row that is also in its muscle group; either
  // will do.
  await page.getByRole('button', { name: /Bankdrücken/ }).first().click()
  await page.getByRole('button', { name: /Latzug/ }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  expect(writes).toEqual([])

  await page.getByRole('button', { name: 'Schließen' }).click()
  await page.getByRole('button', { name: 'Speichern' }).click()
  await expect(page).toHaveURL(/\/training$/)
  expect(writes.length).toBeGreaterThan(0)
})

test('adding a routine is one target, and it yields the corner while a session runs', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await stubBackend(page, { theme: 'light', locale: 'de' })
  await page.goto('/training')
  await waitForScreen(page)

  // The fixture leaves sets outstanding, so the bar owns the bottom of the
  // screen and the button that would sit under it is not rendered at all.
  const add = page.getByRole('button', { name: 'Routine anlegen' })
  await expect(add).toBeHidden()

  await page.getByRole('button', { name: 'Einheit anzeigen' }).click()
  await page.getByRole('button', { name: 'Einheit beenden' }).click()
  await expect(add).toBeVisible()

  // And it lands in the editor with the name field waiting, rather than asking
  // for the name on the way in.
  await add.click()
  await expect(page.getByLabel('name')).toBeFocused()
  await expect(page.getByLabel('name')).toHaveValue('')
})

test('a write from one screen refetches for every reader, with no reload', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await stubBackend(page, { theme: 'light', locale: 'de' })

  // Two components read today's sets: the session-bar provider above the
  // router, and whichever screen is mounted. They used to hold separate
  // refetch counters, so a write made through one was invisible to the other
  // until a reload remounted it — the bar stayed hidden after starting a
  // routine.
  let reads = 0
  await page.route('**/rest/v1/workout_sets*', (route) => {
    if (route.request().method() === 'GET') reads += 1
    return route.fallback()
  })

  const now = new Date()
  const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  await page.goto(`/training/session?date=${key}&routine=r1`)
  await waitForScreen(page)

  const before = reads
  await page.getByRole('button', { name: /starten/i }).first().click()

  // Both readers, not just the one that made the write.
  await expect.poll(() => reads - before, { timeout: 5000 }).toBeGreaterThanOrEqual(2)
  await expect(page.locator('[data-session-bar]')).toBeVisible()
})

test('finishing a session survives a reload', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await stubBackend(page, { theme: 'light', locale: 'de' })
  await page.goto('/training')
  await waitForScreen(page)

  // The fixture leaves sets outstanding, so a session is running.
  await expect(page.locator('[data-session-bar]')).toBeVisible()

  await page.getByRole('button', { name: 'Einheit anzeigen' }).click()
  await page.getByRole('button', { name: 'Einheit beenden' }).click()
  await expect(page.locator('[data-session-bar]')).toBeHidden()

  // It used to be React state, so this brought it straight back.
  await page.reload()
  await waitForScreen(page)
  await expect(page.locator('[data-session-bar]')).toBeHidden()
})

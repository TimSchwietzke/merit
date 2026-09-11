import { expect, stubBackend, test, waitForScreen } from './fixtures'

/**
 * A set logged with no connection, and what happens to it.
 *
 * This is the one critical path that cannot be checked by looking at a screen:
 * the set has to survive the app being closed and reopened in a basement, and
 * then go out on its own when there is a signal again. `CLAUDE.md` asks for
 * end-to-end tests that would catch a regression, and losing somebody's
 * session is the regression worth catching.
 */
const offlineNote = /offline ·/

test('a set logged with no connection survives a reload and goes out later', async ({ page }) => {
  // Three loads, and two of them wait for the network to fail rather than to
  // answer. That is sixteen seconds on an idle machine and more against three
  // other workers, so the budget is stated rather than left to a default sized
  // for a screenshot.
  test.setTimeout(60_000)

  await stubBackend(page, { theme: 'light', locale: 'de' })
  await page.goto('/training/day')
  await waitForScreen(page)
  // The session bar is what logging happens through, and it is the last thing
  // to arrive. Waiting for it is waiting for the day to be loaded.
  const log = page.getByRole('button', { name: 'Satz eintragen' })
  await log.waitFor()

  // Signal gone. Registered last, so it answers before the stubs above it.
  await page.route('**/rest/v1/**', (route) => route.abort('internetdisconnected'))

  await log.click()
  await expect(page.getByText(offlineNote)).toBeVisible()

  // The phone was locked, the tab was evicted, the app opened again. Still in
  // the basement, and the set is still there.
  await page.reload()
  await waitForScreen(page)
  await expect(page.getByText(offlineNote)).toBeVisible()
  // And the session is still a session: the bar came back from the device,
  // with the set that was logged already marked off.
  await expect(page.getByRole('button', { name: 'Satz eintragen' })).toBeVisible()

  // Out of the basement. Nobody presses anything.
  await page.unroute('**/rest/v1/**')
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  await expect(page.getByText(offlineNote)).toHaveCount(0)
})

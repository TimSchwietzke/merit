import { expect, stubBackend, test, waitForScreen } from './fixtures'

/**
 * Weight screen behaviour, against the stubbed backend rather than a database.
 * The database paths CLAUDE.md asks for — log in, log a food, log a set — are a
 * separate job needing a local Supabase; this covers what the screen does once
 * the rows are in hand.
 */
test('the log follows the range control, from either end of the screen', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await stubBackend(page, { theme: 'light', locale: 'de' })
  await page.goto('/weight')
  await waitForScreen(page)
  await page.waitForTimeout(400)

  const rows = page.locator('main ul li')
  const atThirty = await rows.count()
  expect(atThirty, 'the harness seeds more than a week').toBeGreaterThan(7)

  // The control beside the log, which is the point of it being there: reading
  // the log and having to scroll back to the chart to change it is the bug.
  await page.getByRole('radio', { name: '7 T' }).last().click()
  await expect(rows).toHaveCount(7)

  // One state, two controls. The chart is showing the same week.
  await expect(page.getByRole('radio', { name: '7 T' }).first()).toHaveAttribute(
    'aria-checked',
    'true',
  )
})

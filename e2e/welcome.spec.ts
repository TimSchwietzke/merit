import { expect, stubBackend, test, waitForScreen } from './fixtures'

/**
 * The first-run walkthrough, screen by screen.
 *
 * The visual harness captures a route's first screen, and this route has nine:
 * four panels and five questions. So this walks the path the way somebody
 * arriving for the first time does, captures each screen as it passes, and
 * asserts it ends on the dashboard — which is the one thing about the
 * walkthrough that would be silently broken by a wrong step order.
 */
const PANELS = ['merit', 'food', 'training', 'weight']
const STEPS = ['name', 'body', 'about', 'goal', 'target']

for (const theme of ['light', 'dark'] as const) {
  test(`${theme}: the walkthrough runs from the first panel to the dashboard`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await stubBackend(page, { theme, locale: 'de' })
    await page.goto('/welcome')
    await waitForScreen(page)
    await page.evaluate(() => document.fonts.ready)

    const shot = (name: string) =>
      page.screenshot({ path: `e2e/shots/welcome/${theme}-${name}.png`, fullPage: true })

    for (const [index, panel] of PANELS.entries()) {
      await shot(`panel-${index + 1}-${panel}`)
      await page.getByRole('button', { name: index === PANELS.length - 1 ? "Los geht's" : 'Weiter' }).click()
      // The strip scrolls; the panel is only in place once it has stopped.
      await page.waitForTimeout(400)
    }

    for (const [index, step] of STEPS.entries()) {
      await expect(page.getByText(`${index + 1} / ${STEPS.length}`)).toBeVisible()
      await shot(`step-${index + 1}-${step}`)
      await page.getByRole('button', { name: /Weiter|Ziel speichern|Fertig/ }).click()
    }

    await expect(page).toHaveURL(/\/$/)
  })
}

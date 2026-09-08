import {
  ROUTES,
  VIEWPORTS,
  stubBackend,
  test,
  waitForScreen,
  type Locale,
  type Theme,
} from './fixtures'

/**
 * Captures every screen across the width sweep in both themes and both
 * languages. Nothing is asserted — the output is a set of PNGs to look at.
 * German is the stress case (§9: 20–30% longer than English), so it gets the
 * full sweep in both themes; English is captured for comparison.
 */
const MATRIX: { theme: Theme; locale: Locale }[] = [
  { theme: 'light', locale: 'de' },
  { theme: 'dark', locale: 'de' },
  { theme: 'light', locale: 'en' },
  { theme: 'dark', locale: 'en' },
]

for (const { theme, locale } of MATRIX) {
  for (const viewport of VIEWPORTS) {
    test.describe(`${locale} · ${theme} · ${viewport.name}`, () => {
      for (const route of ROUTES) {
        test(route.name, async ({ page }) => {
          await page.setViewportSize({ width: viewport.width, height: viewport.height })
          await stubBackend(page, { theme, locale, signedOut: route.signedOut })
          await page.goto(route.path)
          // Not `networkidle`: Vite's HMR socket never idles, which flaked on
          // ~7% of captures. And not the sidebar `nav` — it is display:none
          // below `lg`, so waiting on that hangs exactly at the widths that
          // matter most.
          await waitForScreen(page)
          // The stubbed queries answer in milliseconds, but they only start
          // once the screen has mounted — on a lazy route that is after its
          // chunk arrives. Without this the capture is of a screen still
          // saying `wird geladen`.
          await page.waitForTimeout(300)
          // Fonts have to be swapped in or the shot measures the fallback.
          await page.evaluate(() => document.fonts.ready)
          await page.screenshot({
            path: `e2e/shots/${route.name}/${locale}-${theme}-${viewport.name}.png`,
            fullPage: true,
          })
        })
      }
    })
  }
}

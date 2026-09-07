import { ROUTES, expect, stubBackend, test } from './fixtures'

/**
 * The checks §16 says to compute rather than judge. These are assertions, not
 * captures: the screenshots show what a screen looks like, this shows what the
 * browser actually resolved.
 */

const TOKENS = {
  light: { ink: 'rgb(38, 37, 33)', inkFaint: 'rgb(115, 108, 92)', accent: 'rgb(79, 107, 44)' },
  dark: { ink: 'rgb(219, 215, 202)', inkFaint: 'rgb(151, 144, 131)', accent: 'rgb(168, 194, 122)' },
} as const

for (const theme of ['light', 'dark'] as const) {
  test(`${theme}: focus ring survives on button and input`, async ({ page }) => {
    await stubBackend(page, { theme, locale: 'de', signedOut: true })
    await page.goto('/sign-in')
    for (const selector of ['input#email', 'button[type=submit]']) {
      await page.locator(selector).focus()
      // Tailwind v4's `transition-colors` covers `outline-color`, so reading
      // straight after focus samples the ring mid-fade and returns a different
      // colour on every run. Wait for the transition to finish, not a sleep.
      await page.locator(selector).evaluate(
        (el) =>
          new Promise<void>((resolve) => {
            const done = () => resolve()
            el.addEventListener('transitionend', done, { once: true })
            setTimeout(done, 400)
          }),
      )
      const outline = await page.locator(selector).evaluate((el) => {
        const s = getComputedStyle(el)
        return { style: s.outlineStyle, width: s.outlineWidth, color: s.outlineColor }
      })
      // §16.2: a 2px accent outline, never removed and never shadcn's ring.
      expect(outline.style, selector).not.toBe('none')
      expect(outline.width, selector).toBe('2px')
      expect(outline.color, selector).toBe(TOKENS[theme].accent)
    }
  })

  test(`${theme}: the account value is ink, not accent`, async ({ page }) => {
    await stubBackend(page, { theme, locale: 'de' })
    await page.goto('/more')
    const colour = await page
      .getByText('harness@merit.test')
      .evaluate((el) => getComputedStyle(el).color)
    expect(colour).toBe(TOKENS[theme].ink)
  })

  test(`${theme}: path bar promotes only the current segment`, async ({ page }) => {
    await stubBackend(page, { theme, locale: 'de' })
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/food')
    const path = page.getByLabel('Pfad')
    await expect(path).toContainText('merit')
    const colours = await path.evaluate((nav) =>
      [...nav.querySelectorAll('a, span:not([aria-hidden])')]
        .filter((el) => el.textContent?.trim() && !el.querySelector('*'))
        .map((el) => `${el.textContent?.trim()}:${getComputedStyle(el).color}`),
    )
    expect(colours).toEqual([
      `merit:${TOKENS[theme].inkFaint}`,
      `ernährung:${TOKENS[theme].inkFaint}`,
      `heute:${TOKENS[theme].ink}`,
    ])
  })
}

test('no horizontal scroll at any width, in German', async ({ page }) => {
  await stubBackend(page, { theme: 'light', locale: 'de' })
  for (const width of [1920, 1440, 1024, 768, 375, 320]) {
    await page.setViewportSize({ width, height: 800 })
    for (const path of ['/', '/food', '/training', '/more']) {
      await page.goto(path)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      // §8: no horizontal scrolling, ever.
      expect(overflow, `${path} at ${width}px`).toBeLessThanOrEqual(0)
    }
  }
})

test('page gutters never exceed 24px, and the column caps at 860px', async ({ page }) => {
  await stubBackend(page, { theme: 'light', locale: 'de' })
  for (const width of [1920, 1440, 1024, 768, 375]) {
    await page.setViewportSize({ width, height: 800 })
    await page.goto('/more')
    const box = await page.locator('main').evaluate((el) => {
      const s = getComputedStyle(el)
      return { left: s.paddingLeft, right: s.paddingRight, w: el.getBoundingClientRect().width }
    })
    // §5.2: 16px on mobile, 24px from md — and no more than 24px at any width.
    expect(parseFloat(box.left), `${width}px`).toBeLessThanOrEqual(24)
    expect(box.left, `${width}px`).toBe(box.right)
    expect(box.w, `${width}px`).toBeLessThanOrEqual(860)
  }
})

test('every touch target clears 44px at 375px, on every screen', async ({ page }) => {
  const offenders: string[] = []
  for (const locale of ['de', 'en'] as const) {
    await stubBackend(page, { theme: 'light', locale })
    await page.setViewportSize({ width: 375, height: 812 })
    for (const route of ROUTES) {
      await page.goto(route.path)
      await page.locator('main').waitFor({ state: 'visible' })
      const small = await page.evaluate(() =>
        [...document.querySelectorAll('button, a, input, [role=radio]')]
          .map((el) => ({ el, r: el.getBoundingClientRect() }))
          .filter(({ r }) => r.width > 0 && (r.height < 44 || r.width < 44))
          .map(
            ({ el, r }) =>
              `${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 24)}" ${Math.round(r.width)}x${Math.round(r.height)}`,
          ),
      )
      offenders.push(...small.map((s) => `${locale} ${route.path}: ${s}`))
    }
  }
  // §5.2 / §16.2: every interactive element is at least 44x44 on touch.
  expect(offenders).toEqual([])
})

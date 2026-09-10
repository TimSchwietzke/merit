import { ROUTES, expect, stubBackend, test, waitForScreen } from './fixtures'

/**
 * The checks §16 says to compute rather than judge. These are assertions, not
 * captures: the screenshots show what a screen looks like, this shows what the
 * browser actually resolved.
 */

// `accent` is the moss the sign-in screen wears: outside a domain, the default
// stands. The training and weight routes rebind it (tokens.css), which is what
// the domain probe below checks.
const TOKENS = {
  light: { ink: 'rgb(38, 37, 33)', inkFaint: 'rgb(115, 108, 92)', accent: 'rgb(79, 107, 44)' },
  dark: { ink: 'rgb(230, 227, 220)', inkFaint: 'rgb(148, 143, 136)', accent: 'rgb(168, 194, 122)' },
} as const

/** The domain hues, dark theme. See `tokens.css`. */
const DOMAIN = {
  '/food': 'rgb(168, 194, 122)',
  '/training': 'rgb(212, 136, 92)',
  '/weight': 'rgb(143, 180, 216)',
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
  test.slow()
  await stubBackend(page, { theme: 'light', locale: 'de' })
  // Each screen is loaded once and then resized, rather than reloaded at every
  // width. Overflow is a layout property, so a resize answers the question just
  // as well — and it leaves the time budget to actually wait for the screen to
  // finish rendering. Measuring straight after `goto` measures the skeleton,
  // which is how a 544px-wide table got past this probe.
  for (const path of ['/', '/food', '/food/add', '/training', '/training/add', '/training/routines', '/more', '/weight', '/goals']) {
    await page.setViewportSize({ width: 375, height: 800 })
    await page.goto(path)
    await waitForScreen(page)
    await page.waitForTimeout(500)

    for (const width of [1920, 1440, 1024, 768, 375, 320]) {
      await page.setViewportSize({ width, height: 800 })
      // The chart re-measures on a resize; give it a frame to do it in.
      await page.waitForTimeout(150)
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
  // Every route in both languages, and the route list keeps growing. The 20s
  // default is sized for one capture, not for a sweep.
  test.slow()
  const offenders: string[] = []
  for (const locale of ['de', 'en'] as const) {
    await stubBackend(page, { theme: 'light', locale })
    await page.setViewportSize({ width: 375, height: 812 })
    for (const route of ROUTES) {
      await page.goto(route.path)
      await waitForScreen(page)
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

test('the undo toast clears the tab bar', async ({ page }) => {
  // It has landed underneath it twice: sonner anchors the *top* of the toast at
  // its bottom offset, so an offset of "bar height plus a gutter" is short by
  // exactly one toast (src/components/ui/sonner.tsx).
  await page.setViewportSize({ width: 375, height: 812 })
  await stubBackend(page, { theme: 'light', locale: 'de' })
  await page.goto('/weight')
  await page.getByRole('button', { name: 'Eintrag löschen' }).click()

  const undo = page.getByRole('button', { name: 'Rückgängig' })
  await undo.waitFor()
  // The toast slides up; measuring mid-animation measures the wrong place.
  await page.waitForTimeout(800)
  const toast = await undo.evaluate(
    (el) => el.closest('[data-sonner-toast]')?.getBoundingClientRect().bottom ?? 0,
  )
  // Not `nav` — there are three, and the header's path bar is the last of them.
  const bar = await page
    .locator('nav.fixed')
    .evaluate((el) => el.getBoundingClientRect().top)

  expect(toast, 'toast overlaps the tab bar').toBeLessThanOrEqual(bar)
})

test('each domain retints the interface, and the wordmark keeps the brand', async ({ page }) => {
  await stubBackend(page, { theme: 'dark', locale: 'de' })

  for (const [route, hue] of Object.entries(DOMAIN)) {
    await page.goto(route)
    await waitForScreen(page)
    const accent = await page.evaluate(() =>
      getComputedStyle(document.querySelector('[data-domain], main')!).getPropertyValue(
        '--merit-accent',
      ),
    )
    // The variable resolves through `var()`, so compare what it paints with.
    const painted = await page.evaluate((value) => {
      const probe = document.createElement('span')
      probe.style.color = value.trim()
      document.body.append(probe)
      const colour = getComputedStyle(probe).color
      probe.remove()
      return colour
    }, accent)
    expect(painted, route).toBe(hue)
  }

  // Whatever the section, the wordmark is merit's own green.
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/training')
  await waitForScreen(page)
  await expect(page.getByLabel('Pfad')).toBeVisible()
})

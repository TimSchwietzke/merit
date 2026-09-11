import { chromium } from '@playwright/test'

import { writeBarcodeVideo } from './barcode-video'
import { expect, stubBackend, test, waitForScreen } from './fixtures'

/**
 * The loop the nutrition slices exist for, against stubbed HTTP: a barcode that
 * is not in the catalogue is resolved through Open Food Facts, written back,
 * and handed to the portion form.
 */
test('a barcode not in the catalogue resolves through Open Food Facts', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await stubBackend(page, { theme: 'light', locale: 'de' })
  await page.goto('/food/add?scan=1')
  await waitForScreen(page)

  // Typed rather than scanned: a headless camera cannot hold up a jar, and the
  // field is the same entry point §10.10 asks for anyway.
  await page.getByRole('textbox', { name: 'barcode' }).fill('3017620422003')
  await page.getByRole('button', { name: 'Nachschlagen' }).click()

  // The portion form, carrying the product the lookup resolved.
  await expect(page.getByText('Nutella')).toBeVisible()
  await expect(page.getByLabel(/menge/i)).toBeVisible()
})

test('a mistyped barcode is refused before any request', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await stubBackend(page, { theme: 'light', locale: 'de' })
  await page.goto('/food/add?scan=1')
  await waitForScreen(page)

  // One digit off. Sending it would come back "not found", which reads as a
  // gap in the catalogue rather than as a typo.
  await page.getByRole('textbox', { name: 'barcode' }).fill('3017620422004')
  await page.getByRole('button', { name: 'Nachschlagen' }).click()

  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByText('Nutella')).toHaveCount(0)
})

test('the torch appears only where the camera has one, and toggles', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await stubBackend(page, { theme: 'light', locale: 'de' })

  // The synthetic camera Chromium provides has no torch, which is the right
  // answer for it and means nothing would ever exercise this control. The
  // capability is forced on so the button is rendered, measured and tapped.
  await page.addInitScript(() => {
    const applied: MediaTrackConstraints[] = []
    ;(window as unknown as { torchApplied: MediaTrackConstraints[] }).torchApplied = applied
    MediaStreamTrack.prototype.getCapabilities = () =>
      ({ torch: true }) as unknown as MediaTrackCapabilities
    MediaStreamTrack.prototype.applyConstraints = async (constraints) => {
      applied.push(constraints ?? {})
    }
  })

  await page.goto('/food/add?scan=1')
  await waitForScreen(page)

  const torch = page.getByRole('button', { name: 'Licht einschalten' })
  await torch.waitFor()

  const box = await torch.boundingBox()
  expect(box?.height, '§5.2: 44px floor').toBeGreaterThanOrEqual(44)
  expect(box?.width).toBeGreaterThanOrEqual(44)

  await torch.click()
  await expect(page.getByRole('button', { name: 'Licht ausschalten' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  const applied = await page.evaluate(
    () => (window as unknown as { torchApplied: MediaTrackConstraints[] }).torchApplied,
  )
  expect(applied.at(-1)).toEqual({ advanced: [{ torch: true }] })
})

test('a barcode held in front of the camera resolves without anyone typing', async ({ page: _unused }, testInfo) => {
  test.slow()
  // The one question worth asking of a scanner. Chromium's own synthetic camera
  // is a rolling colour pattern, so it is replaced with a file containing an
  // actual EAN-13, which needs its own browser, because the flag is a launch
  // option and every other test wants the ordinary fake camera.
  const video = testInfo.outputPath('ean13.y4m')
  writeBarcodeVideo(video, '3017620422003')

  const browser = await chromium.launch({
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-video-capture=${video}`,
    ],
  })

  try {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } })
    await stubBackend(page, { theme: 'light', locale: 'de' })
    await page.goto('http://127.0.0.1:5173/food/add?scan=1')
    await waitForScreen(page)

    // Nothing is typed and nothing is pressed: the camera is the interface.
    await expect(page.getByText('Nutella')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('textbox', { name: /menge/i })).toBeVisible()
  } finally {
    await browser.close()
  }
})

test('a logged row opens on tap and only gives up its delete to a swipe', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await stubBackend(page, { theme: 'light', locale: 'de' })
  await page.goto('/food')
  await waitForScreen(page)

  const row = page.getByRole('link', { name: /Skyr/ })
  await expect(row).toBeVisible()
  // Nothing destructive is on screen until it is asked for (§10.1).
  await expect(page.getByRole('button', { name: 'Entfernen' })).toHaveCount(0)

  // Centre it in the viewport first: the session bar is fixed to the bottom of
  // the screen, so a row that happens to sit under it receives none of the
  // drag.
  await row.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  const box = (await row.boundingBox())!
  const y = box.y + box.height / 2
  await page.mouse.move(box.x + 20, y)
  await page.mouse.down()
  // Past the slop, then past the latch, in steps so the axis is read as
  // horizontal rather than as a page scroll.
  await page.mouse.move(box.x + 80, y, { steps: 8 })

  // Mid-drag, still held: the row is where the finger is. A transition left on
  // during the gesture, or a re-render per pointermove, shows up here as the
  // row trailing the pointer, which is what "unsmooth" actually is.
  const held = await row.evaluate(
    (el) => new DOMMatrix(getComputedStyle(el.parentElement!).transform).m41,
  )
  expect(held, 'the row follows the pointer').toBeGreaterThan(50)

  await page.mouse.move(box.x + 100, y, { steps: 4 })
  await page.mouse.up()

  const remove = page.getByRole('button', { name: 'Entfernen' })
  await expect(remove).toBeVisible()

  // It stays open. The swipe is a latch, not a flick that springs back.
  await page.waitForTimeout(400)
  await expect(remove).toBeVisible()

  await remove.click()
  await expect(page.getByText('Rückgängig')).toBeVisible()
  await expect(page.getByRole('link', { name: /Skyr/ })).toHaveCount(0)
})

test('tapping a logged row opens it for editing, not for deleting', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await stubBackend(page, { theme: 'light', locale: 'de' })
  await page.goto('/food')
  await waitForScreen(page)

  await page.getByRole('link', { name: /Skyr/ }).click()
  await expect(page.getByRole('heading', { name: 'Erfasste Portion' })).toBeVisible()
  // The keyboard route to the same thing the swipe reveals.
  await expect(page.getByRole('button', { name: 'Aus dem Tag entfernen' })).toBeVisible()
})

test('one search asks every source, and typing asks none', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 })
  await stubBackend(page, { theme: 'light', locale: 'de' })

  // Every call to the proxy is counted. Open Food Facts allows ten searches a
  // minute for the whole project, so "a search happens because somebody asked
  // for one" is a promise with a number behind it, and a regression into
  // searching per keystroke would be invisible on screen.
  let searches = 0
  await page.route('**/functions/v1/off-search', async (route) => {
    searches += 1
    await route.fallback()
  })

  await page.goto('/food/add')
  await waitForScreen(page)
  await page.locator('#food-search').fill('skyr')
  await page.waitForTimeout(700)
  expect(searches, 'typing does not spend the quota').toBe(0)

  await page.getByRole('button', { name: 'Suchen' }).click()

  // One press, and all three answer into one list.
  await expect(page.getByRole('button', { name: /katalog/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /open food facts/ })).toBeVisible()
  await expect(page.getByText('Skyr Vanille')).toBeVisible()
  expect(searches).toBe(1)

  // The packet the catalogue already holds is not offered twice: the group
  // carries one of the stub's two products.
  await expect(page.getByRole('button', { name: /open food facts/ })).toContainText('1')

  // Picking one writes it into the shared catalogue and goes to the quantity.
  await page.getByRole('button', { name: /Skyr Vanille/ }).click()
  await expect(page.getByLabel('menge')).toBeVisible()
})

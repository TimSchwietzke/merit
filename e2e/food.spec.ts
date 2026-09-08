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

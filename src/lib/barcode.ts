/**
 * Barcode validation.
 *
 * EAN-13, EAN-8 and UPC-A all carry a check digit computed the same way, so a
 * mistyped or misread code can be rejected here rather than by a round trip
 * that comes back "product not found" and looks like a gap in the catalogue.
 */

export const BARCODE_LENGTHS = [8, 12, 13, 14] as const

/** Digits only, and one of the lengths the `foods.barcode` check allows. */
export function isBarcodeShape(code: string): boolean {
  return /^\d+$/.test(code) && (BARCODE_LENGTHS as readonly number[]).includes(code.length)
}

/**
 * The GS1 check digit: every second digit from the right counts triple, the sum
 * is rounded up to the next ten, and the difference is the last digit.
 */
export function hasValidCheckDigit(code: string): boolean {
  if (!isBarcodeShape(code)) return false

  const digits = [...code].map(Number)
  const check = digits.pop() as number

  const sum = digits
    .reverse()
    .reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0)

  return (10 - (sum % 10)) % 10 === check
}

/**
 * A UPC-A padded to 13 digits, which is how Open Food Facts stores it. Without
 * this the same product scans as two different codes depending on whether the
 * label was printed for Europe or North America.
 */
export function normaliseBarcode(code: string): string {
  const trimmed = code.trim()
  return trimmed.length === 12 ? `0${trimmed}` : trimmed
}

import { describe, expect, it } from 'vitest'

import { hasValidCheckDigit, isBarcodeShape, normaliseBarcode } from '@/lib/barcode'

describe('isBarcodeShape', () => {
  it('accepts the lengths the column allows', () => {
    for (const code of ['12345678', '123456789012', '1234567890123', '12345678901234']) {
      expect(isBarcodeShape(code)).toBe(true)
    }
  })

  it('rejects anything else', () => {
    for (const code of ['', '123', '1234567890', 'abcdefgh', '1234-5678', ' 12345678 ']) {
      expect(isBarcodeShape(code)).toBe(false)
    }
  })
})

describe('hasValidCheckDigit', () => {
  it('accepts real codes', () => {
    // Nutella (EAN-13) and two published examples.
    expect(hasValidCheckDigit('3017620422003')).toBe(true)
    expect(hasValidCheckDigit('4006381333931')).toBe(true)
    expect(hasValidCheckDigit('96385074')).toBe(true)
  })

  it('rejects a single mistyped digit', () => {
    // The point of checking before the request: this comes back "not found"
    // otherwise, which reads as a gap in the catalogue rather than a typo.
    expect(hasValidCheckDigit('3017620422004')).toBe(false)
    expect(hasValidCheckDigit('3017620423003')).toBe(false)
  })

  it('rejects a code of the wrong shape without throwing', () => {
    expect(hasValidCheckDigit('abc')).toBe(false)
    expect(hasValidCheckDigit('')).toBe(false)
  })
})

describe('normaliseBarcode', () => {
  it('pads UPC-A to thirteen digits, which is how Open Food Facts stores it', () => {
    expect(normaliseBarcode('036000291452')).toBe('0036000291452')
  })

  it('leaves every other length alone', () => {
    expect(normaliseBarcode('3017620422003')).toBe('3017620422003')
    expect(normaliseBarcode('96385074')).toBe('96385074')
  })
})

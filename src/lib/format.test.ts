import { describe, expect, it } from 'vitest'

import {
  formatDayLong,
  formatDayShort,
  formatDelta,
  formatForInput,
  formatNumber,
  parseDecimalInput,
} from '@/lib/format'

describe('formatNumber', () => {
  it('uses the locale separator', () => {
    expect(formatNumber(82.4, 'de')).toBe('82,4')
    expect(formatNumber(82.4, 'en')).toBe('82.4')
  })

  it('pads to the requested digits so a column does not jitter', () => {
    expect(formatNumber(82, 'en')).toBe('82.0')
    expect(formatNumber(82.456, 'en', 2)).toBe('82.46')
    expect(formatNumber(82.4, 'en', 0)).toBe('82')
  })
})

describe('formatDelta', () => {
  it('always carries a sign', () => {
    expect(formatDelta(0.3, 'en')).toBe('+0.3')
    expect(formatDelta(0, 'en')).toMatch(/^[+]0\.0$/)
  })

  it('uses the locale minus, not a hyphen', () => {
    // CLDR gives English a hyphen and German a real minus; formatDelta
    // normalises both to U+2212 so the sign is the same glyph in both.
    expect(formatDelta(-0.3, 'en')).toBe('−0.3')
    expect(formatDelta(-0.3, 'de')).toBe('−0,3')
  })
})

describe('formatDayShort / formatDayLong', () => {
  it('reads the day key as a local date, never one off', () => {
    expect(formatDayShort('2026-09-08', 'en')).toMatch(/08/)
    expect(formatDayLong('2026-09-08', 'en')).toMatch(/September/)
    expect(formatDayLong('2026-09-08', 'de')).toMatch(/September/)
  })
})

describe('parseDecimalInput', () => {
  const kg = { min: 20, max: 400, decimals: 2 }

  it('accepts both separators', () => {
    expect(parseDecimalInput('82,4', kg)).toBe(82.4)
    expect(parseDecimalInput('82.4', kg)).toBe(82.4)
    expect(parseDecimalInput(' 82 ', kg)).toBe(82)
  })

  it('rejects anything that is not a plain positive decimal', () => {
    // `1,234` is 1.234 to a German and 1234 to everyone else. Refusing beats
    // picking one and being wrong for half the users.
    for (const raw of ['', '  ', 'eighty', '8e1', '-82', '+82', '1,234.5', '82.', '82..4']) {
      expect(parseDecimalInput(raw, kg)).toBeNull()
    }
  })

  it('rejects more decimals than the column stores', () => {
    expect(parseDecimalInput('82.456', kg)).toBeNull()
    expect(parseDecimalInput('12.34', { min: 1, max: 75, decimals: 1 })).toBeNull()
  })

  it('rejects values outside the range the table would refuse anyway', () => {
    expect(parseDecimalInput('8.2', kg)).toBeNull()
    expect(parseDecimalInput('820', kg)).toBeNull()
    expect(parseDecimalInput('20', kg)).toBe(20)
    expect(parseDecimalInput('400', kg)).toBe(400)
  })
})

describe('formatForInput', () => {
  it('drops trailing zeros without rounding the value away', () => {
    // 82.45 must come back as 82,45. Formatting it to one decimal would change
    // the weight as a side effect of correcting the body-fat figure next to it.
    expect(formatForInput(82.45, 'de', 2)).toBe('82,45')
    expect(formatForInput(82.4, 'de', 2)).toBe('82,4')
    expect(formatForInput(82, 'en', 2)).toBe('82')
  })

  it('never groups thousands — the field has to parse back', () => {
    expect(formatForInput(1082.5, 'en', 2)).toBe('1082.5')
  })
})

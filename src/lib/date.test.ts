import { describe, expect, it } from 'vitest'

import { addDays, dateKey, dayRange, daysBetween, parseDateKey, todayKey } from '@/lib/date'

describe('dateKey', () => {
  it('reads the local calendar day, not the UTC one', () => {
    // The bug this module exists to prevent: 23:30 local on the 8th is already
    // the 9th in UTC for anyone east of Greenwich, and 00:30 is still the 7th
    // for anyone west of it. toISOString() would return the wrong day for one
    // of the two (CLAUDE.md, Dates).
    expect(dateKey(new Date(2026, 8, 8, 23, 30))).toBe('2026-09-08')
    expect(dateKey(new Date(2026, 8, 8, 0, 30))).toBe('2026-09-08')
  })

  it('pads month and day', () => {
    expect(dateKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('parseDateKey', () => {
  it('returns local midnight', () => {
    const date = parseDateKey('2026-09-08')
    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(8)
    expect(date.getDate()).toBe(8)
    expect(date.getHours()).toBe(0)
  })

  it('round-trips through dateKey', () => {
    for (const key of ['2026-01-01', '2026-02-28', '2026-12-31']) {
      expect(dateKey(parseDateKey(key))).toBe(key)
    }
  })
})

describe('addDays', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('crosses a leap day', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
  })

  it('crosses the spring DST change without losing a day', () => {
    // 2026-03-29 is the European change; the day is 23 hours long, so adding
    // 86400000ms to midnight lands at 01:00 on the 30th, still the right day
    // here, but 25-hour days in autumn land at 23:00 on the day before.
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30')
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26')
  })
})

describe('daysBetween', () => {
  it('counts forwards and backwards', () => {
    expect(daysBetween('2026-09-01', '2026-09-08')).toBe(7)
    expect(daysBetween('2026-09-08', '2026-09-01')).toBe(-7)
    expect(daysBetween('2026-09-08', '2026-09-08')).toBe(0)
  })

  it('counts whole days across a DST change', () => {
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2)
  })
})

describe('dayRange', () => {
  it('is inclusive at both ends', () => {
    expect(dayRange('2026-09-06', '2026-09-08')).toEqual(['2026-09-06', '2026-09-07', '2026-09-08'])
  })

  it('is a single day when both ends match, and empty when reversed', () => {
    expect(dayRange('2026-09-08', '2026-09-08')).toEqual(['2026-09-08'])
    expect(dayRange('2026-09-08', '2026-09-06')).toEqual([])
  })
})

describe('todayKey', () => {
  it('reads the day from the clock it is given', () => {
    expect(todayKey(new Date(2026, 8, 8, 22, 15))).toBe('2026-09-08')
  })
})

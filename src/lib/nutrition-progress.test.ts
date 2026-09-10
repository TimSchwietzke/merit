import { describe, expect, it } from 'vitest'

import {
  averageKcal,
  daysOnTarget,
  kcalSeries,
  type DayTotal,
} from '@/lib/nutrition-progress'

const TODAY = '2026-09-10'

const days = (...entries: [string, number][]): DayTotal[] =>
  entries.map(([date, kcal]) => ({ date, kcal }))

describe('averageKcal', () => {
  it('averages the days that were logged, not the days in the window', () => {
    // Two logged days out of seven. Dividing by seven would report 600 and
    // claim somebody ate almost nothing.
    expect(averageKcal(days(['2026-09-09', 2000], ['2026-09-10', 2200]), TODAY, 7)).toBe(2100)
  })

  it('is null with nothing logged, which is not zero', () => {
    expect(averageKcal([], TODAY, 7)).toBeNull()
    expect(averageKcal(days(['2026-08-01', 2000]), TODAY, 7)).toBeNull()
  })

  it('ignores days outside the window at both ends', () => {
    const totals = days(['2026-09-03', 9999], ['2026-09-04', 1000], ['2026-09-10', 2000])
    // A seven-day window ending today starts on the 4th.
    expect(averageKcal(totals, TODAY, 7)).toBe(1500)
  })
})

describe('daysOnTarget', () => {
  it('counts logged days inside the band and says how many were logged', () => {
    const totals = days(
      ['2026-09-08', 2000], // on target
      ['2026-09-09', 1500], // under the band
      ['2026-09-10', 2400], // the top edge counts
    )
    expect(daysOnTarget(totals, 2000, TODAY, 28)).toEqual({ met: 2, logged: 3 })
  })

  it('does not count an unlogged day as a miss', () => {
    expect(daysOnTarget(days(['2026-09-10', 2000]), 2000, TODAY, 28)).toEqual({
      met: 1,
      logged: 1,
    })
  })

  it('takes the band as a fraction of the target', () => {
    const totals = days(['2026-09-10', 2200])
    expect(daysOnTarget(totals, 2000, TODAY, 28, 0.2).met).toBe(1)
    expect(daysOnTarget(totals, 2000, TODAY, 28, 0.05).met).toBe(0)
  })
})

describe('kcalSeries', () => {
  it('fills every day of the window and marks the unlogged ones null', () => {
    const series = kcalSeries(days(['2026-09-09', 2000]), TODAY, 3)
    expect(series).toEqual([
      { date: '2026-09-08', kcal: null },
      { date: '2026-09-09', kcal: 2000 },
      { date: '2026-09-10', kcal: null },
    ])
  })
})

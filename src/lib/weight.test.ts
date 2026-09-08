import { describe, expect, it } from 'vitest'

import {
  buildSeries,
  latestEntry,
  rangeStart,
  rollingAverage,
  weeklyDelta,
  weightDomain,
  type WeightEntry,
} from '@/lib/weight'

const entry = (date: string, weightKg: number): WeightEntry => ({
  date,
  weightKg,
  bodyFatPct: null,
})

/** Seven consecutive days, 82.0 rising to 82.6. */
const week: WeightEntry[] = [
  entry('2026-09-02', 82.0),
  entry('2026-09-03', 82.1),
  entry('2026-09-04', 82.2),
  entry('2026-09-05', 82.3),
  entry('2026-09-06', 82.4),
  entry('2026-09-07', 82.5),
  entry('2026-09-08', 82.6),
]

describe('rollingAverage', () => {
  it('averages the seven calendar days ending on the given day', () => {
    expect(rollingAverage(week, '2026-09-08')).toBeCloseTo(82.3, 10)
  })

  it('ignores anything outside the window on either side', () => {
    const withOutliers = [entry('2026-09-01', 60), ...week, entry('2026-09-09', 100)]
    expect(rollingAverage(withOutliers, '2026-09-08')).toBeCloseTo(82.3, 10)
  })

  it('averages calendar days, not the last seven entries', () => {
    // Somebody weighing in twice a week would otherwise get a fortnight-wide
    // average out of a line labelled "7-day": the last three entries average
    // 85.3, the last seven days average 83.
    const fortnight = [entry('2026-08-26', 90), entry('2026-09-02', 84), entry('2026-09-08', 82)]
    expect(rollingAverage(fortnight, '2026-09-08')).toBe(83)
  })

  it('is null when the window holds nothing', () => {
    expect(rollingAverage(week, '2026-10-01')).toBeNull()
    expect(rollingAverage([], '2026-09-08')).toBeNull()
  })

  it('does not need sorted input', () => {
    expect(rollingAverage([...week].reverse(), '2026-09-08')).toBeCloseTo(82.3, 10)
  })
})

describe('buildSeries', () => {
  it('emits one point per calendar day, with null on the days not logged', () => {
    const series = buildSeries([entry('2026-09-06', 82), entry('2026-09-08', 83)], '2026-09-06', '2026-09-08')
    expect(series.map((point) => point.date)).toEqual(['2026-09-06', '2026-09-07', '2026-09-08'])
    expect(series.map((point) => point.weightKg)).toEqual([82, null, 83])
  })

  it('breaks the average on the same days as the raw line', () => {
    // Carrying the average across a gap draws a flat week of stale data, which
    // is the interpolation DESIGN.md §11 rules out.
    const series = buildSeries([entry('2026-09-01', 82)], '2026-09-01', '2026-09-05')
    expect(series.map((point) => point.averageKg)).toEqual([82, null, null, null, null])
  })

  it('reports the average of the window, not the day', () => {
    const series = buildSeries(week, '2026-09-08', '2026-09-08')
    expect(series[0].weightKg).toBe(82.6)
    expect(series[0].averageKg).toBeCloseTo(82.3, 10)
  })

  it('covers the whole range even where no day was logged', () => {
    expect(buildSeries([], '2026-09-01', '2026-09-30')).toHaveLength(30)
  })
})

describe('weightDomain', () => {
  it('never starts at zero', () => {
    const [min] = weightDomain(buildSeries(week, '2026-09-02', '2026-09-08')) ?? [0, 0]
    expect(min).toBeGreaterThan(80)
  })

  it('pads by at least half a kilo around a flat week', () => {
    const flat = buildSeries([entry('2026-09-08', 82)], '2026-09-08', '2026-09-08')
    expect(weightDomain(flat)).toEqual([81.5, 82.5])
  })

  it('lands on half kilos and contains every value', () => {
    const spread = buildSeries(
      [entry('2026-09-01', 79.3), entry('2026-09-08', 84.7)],
      '2026-09-01',
      '2026-09-08',
    )
    const [min, max] = weightDomain(spread) ?? [0, 0]
    expect(min).toBeLessThan(79.3)
    expect(max).toBeGreaterThan(84.7)
    expect(min * 2).toBe(Math.round(min * 2))
    expect(max * 2).toBe(Math.round(max * 2))
  })

  it('is null when there is nothing to plot', () => {
    expect(weightDomain(buildSeries([], '2026-09-01', '2026-09-08'))).toBeNull()
  })
})

describe('weeklyDelta', () => {
  it('compares two seven-day averages, not two weigh-ins', () => {
    // A single day swings by a kilo on water alone. Both sides are averages so
    // the figure is a trend rather than noise.
    const day = (n: number) => `2026-09-${String(n).padStart(2, '0')}`
    const fortnight = [
      ...Array.from({ length: 7 }, (_, i) => entry(day(i + 1), 83)),
      ...Array.from({ length: 7 }, (_, i) => entry(day(i + 9), 82)),
    ]
    // 09-09..09-15 average 82, 09-02..09-08 average 83.
    expect(weeklyDelta(fortnight, '2026-09-15')).toBeCloseTo(-1, 10)
  })

  it('is null until both windows hold something', () => {
    expect(weeklyDelta(week, '2026-09-08')).toBeNull()
    expect(weeklyDelta([], '2026-09-08')).toBeNull()
  })
})

describe('latestEntry', () => {
  it('is the most recent day, whatever order the rows arrive in', () => {
    expect(latestEntry([...week].reverse())?.date).toBe('2026-09-08')
    expect(latestEntry([])).toBeNull()
  })
})

describe('rangeStart', () => {
  it('counts the range inclusive of today', () => {
    expect(rangeStart('7', '2026-09-08')).toBe('2026-09-02')
    expect(rangeStart('30', '2026-09-08')).toBe('2026-08-10')
  })

  it('is null for all, which has no start', () => {
    expect(rangeStart('all', '2026-09-08')).toBeNull()
  })
})

describe('weightDomain ticks', () => {
  it('spans a whole number of readable steps, so the four ticks land on them', () => {
    const points = buildSeries(
      [entry('2026-09-01', 81.4), entry('2026-09-08', 83.1)],
      '2026-09-01',
      '2026-09-08',
    )
    const [min, max] = weightDomain(points) ?? [0, 0]
    const step = (max - min) / 4
    for (let i = 0; i <= 4; i += 1) {
      const tick = min + i * step
      expect(Math.round(tick * 100) / 100).toBe(tick)
    }
    expect(min).toBeLessThanOrEqual(81.4)
    expect(max).toBeGreaterThanOrEqual(83.1)
  })
})

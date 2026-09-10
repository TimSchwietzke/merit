import { describe, expect, it } from 'vitest'

import { trend, weeklyVolume } from '@/lib/progress'
import type { LoggedSet, SessionSets } from '@/lib/training'

const set = (reps: number, weightKg: number, done = true): LoggedSet => ({
  id: Math.random().toString(36),
  exerciseId: 'x1',
  setNumber: 1,
  reps,
  weightKg,
  rir: null,
  done,
})

// 2026-09-10 is a Thursday, so its week runs Mon 07 – Sun 13.
const TODAY = '2026-09-10'

describe('weeklyVolume', () => {
  it('sums reps × weight across the week, counting only performed sets', () => {
    const sessions: SessionSets[] = [
      { date: '2026-09-07', sets: [set(10, 50), set(8, 60)] },
      { date: '2026-09-10', sets: [set(5, 100), set(5, 100, false)] },
    ]

    const points = weeklyVolume(sessions, TODAY, 2)
    expect(points).toHaveLength(2)
    expect(points[1].week).toBe('2026-09-07')
    // 500 + 480 from Monday, 500 from Thursday. The planned set is not tonnage.
    expect(points[1].volumeKg).toBe(1480)
    expect(points[1].sessions).toBe(2)
  })

  it('keeps an untrained week as a zero rather than dropping it', () => {
    const points = weeklyVolume([{ date: '2026-09-07', sets: [set(10, 50)] }], TODAY, 3)
    expect(points.map((point) => point.week)).toEqual(['2026-08-24', '2026-08-31', '2026-09-07'])
    expect(points.map((point) => point.volumeKg)).toEqual([0, 0, 500])
  })

  it('ignores sessions outside the window', () => {
    const sessions: SessionSets[] = [
      { date: '2026-06-01', sets: [set(10, 100)] },
      { date: '2026-09-08', sets: [set(10, 10)] },
    ]
    const total = weeklyVolume(sessions, TODAY, 4).reduce((sum, p) => sum + p.volumeKg, 0)
    expect(total).toBe(100)
  })

  it('counts days trained, not sessions logged', () => {
    // Two routines on one day is one day of training.
    const points = weeklyVolume(
      [{ date: '2026-09-08', sets: [set(1, 1), set(1, 1)] }],
      TODAY,
      1,
    )
    expect(points[0].sessions).toBe(1)
  })
})

describe('trend', () => {
  it('compares the latest week with the mean of the ones before it', () => {
    const points = weeklyVolume(
      [
        { date: '2026-08-31', sets: [set(10, 100)] },
        { date: '2026-09-07', sets: [set(15, 100)] },
      ],
      TODAY,
      2,
    )
    // 1500 against a 1000 baseline.
    expect(trend(points)).toBeCloseTo(0.5)
  })

  it('is null with nothing to compare against, which is not zero', () => {
    expect(trend([])).toBeNull()
    expect(trend(weeklyVolume([], TODAY, 1))).toBeNull()
    // Every earlier week empty: a change from nothing has no percentage.
    expect(trend(weeklyVolume([{ date: '2026-09-07', sets: [set(10, 100)] }], TODAY, 3))).toBeNull()
  })
})

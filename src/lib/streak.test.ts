import { describe, expect, it } from 'vitest'

import { dailyStreak, dayCells, weekCells, weeklyStreak, type PlannedWeek } from '@/lib/streak'

// 2026-09-10 is a Thursday; its week runs Mon 07 – Sun 13.
const TODAY = '2026-09-10'

describe('dailyStreak', () => {
  it('counts back from today when today is logged', () => {
    expect(dailyStreak(['2026-09-08', '2026-09-09', '2026-09-10'], TODAY)).toBe(3)
  })

  it('does not break on a today that has not happened yet', () => {
    // Nine in the morning, breakfast unlogged. Four days still stand.
    expect(dailyStreak(['2026-09-06', '2026-09-07', '2026-09-08', '2026-09-09'], TODAY)).toBe(4)
  })

  it('breaks on a finished empty day', () => {
    // The 9th is missing, so nothing before it counts.
    expect(dailyStreak(['2026-09-06', '2026-09-07', '2026-09-08', '2026-09-10'], TODAY)).toBe(1)
  })

  it('is zero with nothing logged, and ignores days in the future', () => {
    expect(dailyStreak([], TODAY)).toBe(0)
    expect(dailyStreak(['2026-09-12'], TODAY)).toBe(0)
  })
})

const week = (monday: string, planned: number, trained: number): PlannedWeek => ({
  week: monday,
  planned,
  trained,
})

describe('weeklyStreak', () => {
  it('counts weeks that met their own plan', () => {
    expect(
      weeklyStreak([week('2026-08-24', 2, 2), week('2026-08-31', 2, 3), week('2026-09-07', 2, 2)], TODAY),
    ).toBe(3)
  })

  it('skips an unfinished current week rather than failing it', () => {
    // Tuesday of a week planning three sessions, one done. The two complete
    // weeks behind it still stand.
    const weeks = [week('2026-08-31', 2, 2), week('2026-09-07', 3, 1)]
    expect(weeklyStreak(weeks, TODAY)).toBe(1)
  })

  it('breaks on a completed week that missed its plan', () => {
    expect(
      weeklyStreak([week('2026-08-24', 2, 2), week('2026-08-31', 2, 1), week('2026-09-07', 2, 2)], TODAY),
    ).toBe(1)
  })

  it('treats a week that planned nothing as met', () => {
    // A routine with no weekdays is started on demand; nobody failed a week
    // they were never asked to train in.
    expect(weeklyStreak([week('2026-08-31', 0, 0), week('2026-09-07', 1, 1)], TODAY)).toBe(2)
  })

  it('is zero when the most recent complete week missed', () => {
    expect(weeklyStreak([week('2026-08-31', 3, 1), week('2026-09-07', 3, 0)], TODAY)).toBe(0)
  })
})

describe('cells', () => {
  it('puts the most recent period on the right', () => {
    const cells = weekCells([week('2026-09-07', 1, 1)], TODAY, 3)
    expect(cells).toEqual([false, false, true])
  })

  it('marks a day cell only for a day that was logged', () => {
    expect(dayCells(['2026-09-10', '2026-09-08'], TODAY, 4)).toEqual([false, true, false, true])
  })
})

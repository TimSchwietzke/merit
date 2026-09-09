import { describe, expect, it } from 'vitest'

import {
  groupSets,
  lastSessionFor,
  nextSetNumber,
  repeatOf,
  volume,
  type LoggedSet,
  type SessionSets,
} from '@/lib/training'

const set = (setNumber: number, reps: number, weightKg: number, exerciseId = 'bench'): LoggedSet => ({
  id: `${exerciseId}-${setNumber}`,
  exerciseId,
  setNumber,
  reps,
  weightKg,
  rir: null,
})

describe('groupSets', () => {
  it('says what people say out loud', () => {
    expect(groupSets([set(1, 8, 60), set(2, 8, 60), set(3, 8, 60)])).toEqual([
      { sets: 3, reps: 8, weightKg: 60 },
    ])
  })

  it('keeps a drop-off as its own line, in the order it happened', () => {
    // 8/8/6 at one weight is two lines. Merging by value would report
    // `2 × 8` and `1 × 6` and lose that the six came last, which is the
    // interesting part.
    expect(groupSets([set(1, 8, 60), set(2, 8, 60), set(3, 6, 60)])).toEqual([
      { sets: 2, reps: 8, weightKg: 60 },
      { sets: 1, reps: 6, weightKg: 60 },
    ])
  })

  it('does not merge across a return to the earlier figures', () => {
    expect(groupSets([set(1, 8, 60), set(2, 6, 70), set(3, 8, 60)])).toHaveLength(3)
  })

  it('sorts by set number rather than trusting the order given', () => {
    expect(groupSets([set(3, 6, 60), set(1, 8, 60), set(2, 8, 60)])).toEqual([
      { sets: 2, reps: 8, weightKg: 60 },
      { sets: 1, reps: 6, weightKg: 60 },
    ])
  })

  it('is empty for nothing', () => {
    expect(groupSets([])).toEqual([])
  })
})

describe('lastSessionFor', () => {
  const sessions: SessionSets[] = [
    { date: '2026-09-01', sets: [set(1, 8, 55), set(2, 8, 55)] },
    { date: '2026-09-05', sets: [set(1, 8, 60), set(2, 8, 60)] },
    { date: '2026-09-08', sets: [set(1, 10, 20, 'curl')] },
    { date: '2026-09-09', sets: [set(1, 8, 62.5)] },
  ]

  it('is the most recent day before the one asked about', () => {
    expect(lastSessionFor(sessions, 'bench', '2026-09-09')?.date).toBe('2026-09-05')
  })

  it('ignores the day itself', () => {
    // The sets from today are already on screen; comparing today with today
    // says nothing.
    expect(lastSessionFor(sessions, 'bench', '2026-09-05')?.date).toBe('2026-09-01')
  })

  it('only counts days that included this exercise', () => {
    expect(lastSessionFor(sessions, 'curl', '2026-09-09')?.date).toBe('2026-09-08')
    expect(lastSessionFor(sessions, 'curl', '2026-09-08')).toBeNull()
  })

  it('returns only that exercise, not the whole session', () => {
    const mixed: SessionSets[] = [
      { date: '2026-09-01', sets: [set(1, 8, 60), set(1, 10, 20, 'curl')] },
    ]
    expect(lastSessionFor(mixed, 'bench', '2026-09-09')?.sets).toHaveLength(1)
  })

  it('is null when the exercise has never been done', () => {
    expect(lastSessionFor(sessions, 'squat', '2026-09-09')).toBeNull()
    expect(lastSessionFor([], 'bench', '2026-09-09')).toBeNull()
  })
})

describe('volume', () => {
  it('is reps times weight, summed', () => {
    expect(volume([set(1, 8, 60), set(2, 6, 70)])).toBe(8 * 60 + 6 * 70)
  })

  it('counts a bodyweight set as no load rather than as an error', () => {
    expect(volume([set(1, 12, 0)])).toBe(0)
  })
})

describe('nextSetNumber', () => {
  it('is one past the highest already logged for that exercise', () => {
    const sets = [set(1, 8, 60), set(2, 8, 60), set(1, 10, 20, 'curl')]
    expect(nextSetNumber(sets, 'bench')).toBe(3)
    expect(nextSetNumber(sets, 'curl')).toBe(2)
  })

  it('starts at one for an exercise not yet logged', () => {
    expect(nextSetNumber([], 'bench')).toBe(1)
  })
})

describe('repeatOf', () => {
  it('offers the last set again, which is what usually happens next', () => {
    expect(repeatOf([set(1, 8, 60), set(2, 6, 70)], 'bench')).toMatchObject({ reps: 6, weightKg: 70 })
  })

  it('is null with nothing to repeat', () => {
    expect(repeatOf([], 'bench')).toBeNull()
  })
})

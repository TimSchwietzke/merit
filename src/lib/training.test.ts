import { describe, expect, it } from 'vitest'

import {
  activeSet,
  firstOutstandingOf,
  groupSets,
  nextActive,
  isoWeekday,
  nextSession,
  planPaused,
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
  done: true,
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

describe('nextSession', () => {
  // 2026-09-07 is a Monday.
  const plan = [
    { id: 'upper', name: 'Oberkörper 1', weekdays: [1, 4] },
    { id: 'legs', name: 'Beine', weekdays: [6] },
  ]

  it('counts a session due today as nought days away', () => {
    expect(nextSession(plan, '2026-09-07')).toMatchObject({ inDays: 0, day: { id: 'upper' } })
  })

  it('finds the next one across the rest of the week', () => {
    expect(nextSession(plan, '2026-09-08')).toMatchObject({ inDays: 2, day: { id: 'upper' } })
    // The 4th is a Friday; legs sit on Saturday.
    expect(nextSession(plan, '2026-09-04')).toMatchObject({ inDays: 1, day: { id: 'legs' } })
  })

  it('wraps into next week', () => {
    // Sunday with nothing on it; the next is Monday.
    expect(nextSession(plan, '2026-09-13')).toMatchObject({ inDays: 1, day: { id: 'upper' } })
  })

  it('is null when nothing is planned at all', () => {
    expect(nextSession([], '2026-09-07')).toBeNull()
    expect(nextSession([{ id: 'x', name: 'x', weekdays: [] }], '2026-09-07')).toBeNull()
  })
})

describe('isoWeekday', () => {
  it('starts the week on Monday, not on Sunday', () => {
    expect(isoWeekday('2026-09-07')).toBe(1)
    expect(isoWeekday('2026-09-13')).toBe(7)
  })
})

describe('planPaused', () => {
  it('is paused up to and including the last day', () => {
    expect(planPaused('2026-09-20', '2026-09-09')).toBe(true)
    expect(planPaused('2026-09-20', '2026-09-20')).toBe(true)
    expect(planPaused('2026-09-20', '2026-09-21')).toBe(false)
  })

  it('is not paused when nothing was set, however the nothing arrives', () => {
    // A profile row read before the column existed comes back with the field
    // missing, and `undefined !== null` is true — which is how an undefined
    // reached a date parser and took the dashboard down.
    expect(planPaused(null, '2026-09-09')).toBe(false)
    expect(planPaused(undefined, '2026-09-09')).toBe(false)
    expect(planPaused('', '2026-09-09')).toBe(false)
  })
})

describe('the active set', () => {
  const bench = (n: number, done = false) => ({ ...set(n, 8, 60, 'bench'), done })
  const row = (n: number, done = false) => ({ ...set(n, 10, 55, 'row'), done })

  it('is the first outstanding one when nothing has been chosen', () => {
    expect(activeSet([bench(1), bench(2), row(1)], null)?.id).toBe('bench-1')
  })

  it('walks down the exercise it is in before going anywhere else', () => {
    const sets = [bench(1, true), bench(2), row(1)]
    expect(nextActive(sets, sets[0])).toBe('bench-2')
  })

  it('goes back to the top of the session once an exercise runs out', () => {
    // Row 1 comes after bench on screen but is outstanding, and bench is done.
    const sets = [bench(1, true), bench(2, true), row(1)]
    expect(nextActive(sets, sets[1])).toBe('row-1')
  })

  it('takes the first outstanding one from anywhere when nothing precedes it', () => {
    const sets = [bench(1, true), bench(2), row(1)]
    expect(nextActive(sets)).toBe('bench-2')
  })

  it('is null when the session is finished, which is what ends it', () => {
    expect(nextActive([bench(1, true), row(1, true)])).toBeNull()
    expect(activeSet([bench(1, true)], null)).toBeNull()
  })

  it('keeps a set the user chose, until it is logged', () => {
    // Without this a tap on set three is undone by the next render.
    const sets = [bench(1), bench(2), bench(3)]
    expect(activeSet(sets, 'bench-3')?.id).toBe('bench-3')

    const logged = [bench(1), bench(2), bench(3, true)]
    expect(activeSet(logged, 'bench-3')?.id).toBe('bench-1')
  })

  it('selects an exercise by its first outstanding set', () => {
    const sets = [bench(1, true), bench(2), row(1)]
    expect(firstOutstandingOf(sets, 'bench')?.id).toBe('bench-2')
    expect(firstOutstandingOf(sets, 'nothing')).toBeNull()
  })
})

describe('a planned set counts for nothing until it is logged', () => {
  const planned = (n: number) => ({ ...set(n, 8, 60, 'bench'), done: false })

  it('stays out of the volume', () => {
    // Otherwise starting a session reports it as trained.
    expect(volume([set(1, 8, 60), planned(2)])).toBe(480)
  })

  it('stays out of the comparison line', () => {
    const sessions: SessionSets[] = [
      { date: '2026-09-01', sets: [set(1, 8, 55)] },
      { date: '2026-09-05', sets: [planned(1), planned(2)] },
    ]
    expect(lastSessionFor(sessions, 'bench', '2026-09-09')?.date).toBe('2026-09-01')
  })

  it('is not what the next set repeats', () => {
    expect(repeatOf([set(1, 8, 60), planned(2)], 'bench')).toMatchObject({ reps: 8, weightKg: 60 })
    expect(repeatOf([planned(1)], 'bench')).toBeNull()
  })

  it('still shows in the list, which is how it gets done', () => {
    expect(groupSets([set(1, 8, 60), planned(2)])).toEqual([{ sets: 2, reps: 8, weightKg: 60 }])
  })
})

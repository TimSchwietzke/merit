import { describe, expect, it } from 'vitest'

import {
  addTo,
  isPast,
  removeFrom,
  replaceOn,
  scheduledOn,
  swap,
  upcomingInstances,
  weekOf,
  type Override,
  type PlannedRoutine,
} from '@/lib/schedule'

// 2026-09-07 is a Monday, 2026-09-10 a Thursday.
const MON = '2026-09-07'
const THU = '2026-09-10'
const SAT = '2026-09-12'

const routines: PlannedRoutine[] = [
  { id: 'upperA', name: 'Oberkörper 1', weekdays: [1] },
  { id: 'upperB', name: 'Oberkörper 2', weekdays: [4] },
  { id: 'legs', name: 'Beine', weekdays: [6] },
  { id: 'adhoc', name: 'Nur auf Zuruf', weekdays: [] },
]

describe('scheduledOn', () => {
  it('follows the weekly pattern when nothing has happened to it', () => {
    expect(scheduledOn(routines, [], MON).map((r) => r.id)).toEqual(['upperA'])
    expect(scheduledOn(routines, [], THU).map((r) => r.id)).toEqual(['upperB'])
    expect(scheduledOn(routines, [], '2026-09-08')).toEqual([])
  })

  it('never schedules a routine with no weekday of its own', () => {
    for (const date of weekOf(MON)) {
      expect(scheduledOn(routines, [], date).map((r) => r.id)).not.toContain('adhoc')
    }
  })

  it('takes a skipped routine off its own day and puts an added one on any day', () => {
    const overrides: Override[] = [
      { routineId: 'upperA', date: MON, status: 'skipped' },
      { routineId: 'legs', date: MON, status: 'added' },
    ]
    expect(scheduledOn(routines, overrides, MON).map((r) => r.id)).toEqual(['legs'])
  })

  it('leaves every other week alone', () => {
    // The whole reason exceptions are per date rather than edits to the plan.
    const overrides: Override[] = [{ routineId: 'upperA', date: MON, status: 'skipped' }]
    expect(scheduledOn(routines, overrides, '2026-09-14').map((r) => r.id)).toEqual(['upperA'])
  })

  it('can hold two sessions on one day', () => {
    const overrides: Override[] = [{ routineId: 'legs', date: MON, status: 'added' }]
    expect(scheduledOn(routines, overrides, MON)).toHaveLength(2)
  })
})

describe('removeFrom / addTo', () => {
  it('writes an exception where the pattern says otherwise', () => {
    expect(removeFrom([], 'upperA', MON)).toEqual([
      { op: 'insert', routineId: 'upperA', date: MON, status: 'skipped' },
    ])
    expect(addTo([], 'legs', MON)).toEqual([
      { op: 'insert', routineId: 'legs', date: MON, status: 'added' },
    ])
  })

  it('undoes an exception by deleting it, not by adding its opposite', () => {
    // Otherwise a day swapped back and forth collects a row per change and the
    // schedule becomes a ledger of everything anybody ever did to it.
    const added: Override[] = [{ routineId: 'legs', date: MON, status: 'added' }]
    expect(removeFrom(added, 'legs', MON)).toEqual([{ op: 'delete', routineId: 'legs', date: MON }])

    const skipped: Override[] = [{ routineId: 'upperA', date: MON, status: 'skipped' }]
    expect(addTo(skipped, 'upperA', MON)).toEqual([
      { op: 'delete', routineId: 'upperA', date: MON },
    ])
  })

  it('does nothing when the exception already says what is wanted', () => {
    const skipped: Override[] = [{ routineId: 'upperA', date: MON, status: 'skipped' }]
    expect(removeFrom(skipped, 'upperA', MON)).toEqual([])
  })
})

describe('swap', () => {
  it('exchanges two days so both sessions still happen', () => {
    const intents = swap(
      [],
      { routineId: 'upperA', date: MON },
      { routineId: 'upperB', date: THU },
    )
    const after = applied([], intents)

    expect(scheduledOn(routines, after, MON).map((r) => r.id)).toEqual(['upperB'])
    expect(scheduledOn(routines, after, THU).map((r) => r.id)).toEqual(['upperA'])
  })

  it('collapses back to no exceptions when swapped back', () => {
    const first = applied([], swap([], { routineId: 'upperA', date: MON }, { routineId: 'upperB', date: THU }))
    const second = applied(
      first,
      swap(first, { routineId: 'upperB', date: MON }, { routineId: 'upperA', date: THU }),
    )
    expect(second).toEqual([])
  })
})

describe('replaceOn', () => {
  it('runs the wanted routine and drops the displaced one for that date only', () => {
    const after = applied([], replaceOn([], MON, 'upperA', 'legs'))
    expect(scheduledOn(routines, after, MON).map((r) => r.id)).toEqual(['legs'])
    // Next Monday is Oberkörper 1 again: the plan was never edited.
    expect(scheduledOn(routines, after, '2026-09-14').map((r) => r.id)).toEqual(['upperA'])
  })

  it('can bring in a routine that has no weekday at all', () => {
    const after = applied([], replaceOn([], MON, 'upperA', 'adhoc'))
    expect(scheduledOn(routines, after, MON).map((r) => r.id)).toEqual(['adhoc'])
  })
})

describe('weekOf', () => {
  it('runs Monday to Sunday around any day in it', () => {
    expect(weekOf(THU)[0]).toBe(MON)
    expect(weekOf(THU)).toHaveLength(7)
    expect(weekOf('2026-09-13')[0]).toBe(MON) // Sunday belongs to the week before it
  })
})

describe('upcomingInstances', () => {
  it('lists the days a routine falls on, exceptions included', () => {
    const days = upcomingInstances(routines, [], 'upperA', MON, 3)
    expect(days).toEqual(['2026-09-07', '2026-09-14', '2026-09-21'])
  })

  it('drops an instance that was skipped and includes one that was moved in', () => {
    const overrides: Override[] = [
      { routineId: 'upperA', date: '2026-09-14', status: 'skipped' },
      { routineId: 'upperA', date: SAT, status: 'added' },
    ]
    const days = upcomingInstances(routines, overrides, 'upperA', MON, 3)
    expect(days).toContain(SAT)
    expect(days).not.toContain('2026-09-14')
  })
})

describe('isPast', () => {
  it('is yesterday and earlier, never today', () => {
    expect(isPast('2026-09-06', MON)).toBe(true)
    expect(isPast(MON, MON)).toBe(false)
    expect(isPast(THU, MON)).toBe(false)
  })
})

/** Apply intents to an override list, the way the hook does against the table. */
function applied(overrides: Override[], intents: ReturnType<typeof swap>): Override[] {
  let next = [...overrides]
  for (const intent of intents) {
    next = next.filter((o) => !(o.routineId === intent.routineId && o.date === intent.date))
    if (intent.op === 'insert') {
      next.push({ routineId: intent.routineId, date: intent.date, status: intent.status })
    }
  }
  return next
}

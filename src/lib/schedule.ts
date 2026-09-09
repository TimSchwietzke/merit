import { addDays, daysBetween } from '@/lib/date'
import { isoWeekday } from '@/lib/training'

/**
 * What is on which day.
 *
 * The weekly pattern is the plan and never changes when a week goes sideways.
 * Everything that can happen to a single day — moving a session, swapping two,
 * replacing one, adding a second — is expressed as an exception to the pattern
 * for that date, so next Monday is still Monday's session however this Monday
 * went.
 */

export interface PlannedRoutine {
  id: string
  name: string
  /** ISO weekdays, 1 = Monday. Empty means it is only ever started on demand. */
  weekdays: number[]
}

export interface Override {
  routineId: string
  date: string
  /** `added` puts it on a day the pattern does not; `skipped` takes it off one. */
  status: 'added' | 'skipped'
}

/** A write the caller should make to reach the schedule it asked for. */
export type Intent =
  | { op: 'insert'; routineId: string; date: string; status: 'added' | 'skipped' }
  | { op: 'delete'; routineId: string; date: string }

/** The routines due on a day, pattern and exceptions together. */
export function scheduledOn(
  routines: readonly PlannedRoutine[],
  overrides: readonly Override[],
  date: string,
): PlannedRoutine[] {
  const weekday = isoWeekday(date)
  const on = new Set<string>()

  for (const routine of routines) if (routine.weekdays.includes(weekday)) on.add(routine.id)
  for (const override of overrides) {
    if (override.date !== date) continue
    if (override.status === 'added') on.add(override.routineId)
    else on.delete(override.routineId)
  }

  return routines.filter((routine) => on.has(routine.id))
}

/**
 * Take a routine off a day.
 *
 * An exception is undone by deleting it rather than by adding its opposite —
 * otherwise a day swapped back and forth accumulates a row per change and the
 * schedule becomes a ledger of everything anyone ever did to it.
 */
export function removeFrom(
  overrides: readonly Override[],
  routineId: string,
  date: string,
): Intent[] {
  const existing = overrides.find((o) => o.routineId === routineId && o.date === date)
  if (existing?.status === 'added') return [{ op: 'delete', routineId, date }]
  if (existing?.status === 'skipped') return []
  return [{ op: 'insert', routineId, date, status: 'skipped' }]
}

/** Put a routine on a day. The mirror of `removeFrom`. */
export function addTo(
  overrides: readonly Override[],
  routineId: string,
  date: string,
): Intent[] {
  const existing = overrides.find((o) => o.routineId === routineId && o.date === date)
  if (existing?.status === 'skipped') return [{ op: 'delete', routineId, date }]
  if (existing?.status === 'added') return []
  return [{ op: 'insert', routineId, date, status: 'added' }]
}

/** Exchange two days: both sessions still happen, on each other's dates. */
export function swap(
  overrides: readonly Override[],
  a: { routineId: string; date: string },
  b: { routineId: string; date: string },
): Intent[] {
  return [
    ...removeFrom(overrides, a.routineId, a.date),
    ...removeFrom(overrides, b.routineId, b.date),
    ...addTo(overrides, a.routineId, b.date),
    ...addTo(overrides, b.routineId, a.date),
  ]
}

/**
 * Run one routine on a day instead of another. The displaced one loses this
 * date only — the pattern is untouched, so it is back next week.
 */
export function replaceOn(
  overrides: readonly Override[],
  date: string,
  displaced: string,
  wanted: string,
): Intent[] {
  return [...removeFrom(overrides, displaced, date), ...addTo(overrides, wanted, date)]
}

/** Monday to Sunday of the week containing a day. */
export function weekOf(date: string): string[] {
  const monday = addDays(date, -(isoWeekday(date) - 1))
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index))
}

/**
 * The next `weeks` worth of days a routine falls on, pattern and exceptions
 * together — what the "pick the instances" screen lists.
 */
export function upcomingInstances(
  routines: readonly PlannedRoutine[],
  overrides: readonly Override[],
  routineId: string,
  from: string,
  weeks = 4,
): string[] {
  const days: string[] = []
  for (let offset = 0; offset < weeks * 7; offset += 1) {
    const date = addDays(from, offset)
    if (scheduledOn(routines, overrides, date).some((routine) => routine.id === routineId)) {
      days.push(date)
    }
  }
  return days
}

/** Whether a date is before today, which is what cannot be rescheduled. */
export function isPast(date: string, today: string): boolean {
  return daysBetween(date, today) > 0
}

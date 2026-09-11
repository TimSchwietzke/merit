import { addDays } from '@/lib/date'
import { weekOf } from '@/lib/schedule'

/**
 * How long something has been kept up.
 *
 * A streak here is a count of what happened, and nothing else. It is never
 * rendered with a flame, never counts down to being lost, and never sends a
 * notification, those are the app leaning on somebody about their own body,
 * which is the one thing it does not do (PRODUCT.md). The number is a fact.
 *
 * The two domains count different things because they *are* different things.
 * Logging food is the behaviour on the nutrition side, so days logged is the
 * honest unit. Training is planned in weekdays, so a daily count would break on
 * every rest day the plan itself asked for, it counts weeks that met their own
 * plan instead.
 */

/**
 * Consecutive days ending today, or ending yesterday if today has nothing yet.
 *
 * Today's grace is the whole design: at nine in the morning you have not logged
 * breakfast, and a streak that reads zero until you do is a streak that spends
 * most of its life lying. An unfinished day cannot break anything; only a
 * finished empty one can.
 */
export function dailyStreak(days: Iterable<string>, today: string): number {
  const logged = new Set(days)
  let cursor = logged.has(today) ? today : addDays(today, -1)
  let count = 0

  while (logged.has(cursor)) {
    count += 1
    cursor = addDays(cursor, -1)
  }

  return count
}

export interface PlannedWeek {
  /** Monday of the week, as a day key. */
  week: string
  /** Sessions the plan asked for. Zero means the week asked for nothing. */
  planned: number
  /** Days in the week with at least one performed set. */
  trained: number
}

/**
 * Consecutive weeks that met their own plan, most recent first.
 *
 * The current week is counted only once it is already met, and is otherwise
 * skipped rather than counted as a failure, it is Tuesday and there are four
 * days left. Same grace as the daily count, one unit up.
 *
 * A week that planned nothing is met by definition. That is not a loophole: a
 * routine with no weekdays is started on demand, and a week nobody was asked to
 * train is not a week anybody failed.
 */
export function weeklyStreak(weeks: readonly PlannedWeek[], today: string): number {
  const thisMonday = weekOf(today)[0]
  const byWeek = new Map(weeks.map((entry) => [entry.week, entry]))

  const met = (entry: PlannedWeek | undefined) =>
    entry !== undefined && entry.trained >= entry.planned

  let cursor = met(byWeek.get(thisMonday)) ? thisMonday : addDays(thisMonday, -7)
  let count = 0

  while (met(byWeek.get(cursor))) {
    count += 1
    cursor = addDays(cursor, -7)
  }

  return count
}

/**
 * The trailing run of periods as filled/empty cells, oldest last on the right:
 * the mosaic §10.10 renders a consistency mark as.
 *
 * Deliberately boolean: a cell is met or it is not. A half-filled cell invites
 * reading a bad week as a partial success, and the strip exists to be read at a
 * glance rather than interpreted.
 */
export function weekCells(weeks: readonly PlannedWeek[], today: string, count = 12): boolean[] {
  const thisMonday = weekOf(today)[0]
  const byWeek = new Map(weeks.map((entry) => [entry.week, entry]))

  return Array.from({ length: count }, (_, index) => {
    const entry = byWeek.get(addDays(thisMonday, -7 * (count - 1 - index)))
    return entry !== undefined && entry.trained >= entry.planned
  })
}

/** The same strip for a daily count: one cell per day, ending today. */
export function dayCells(days: Iterable<string>, today: string, count = 14): boolean[] {
  const logged = new Set(days)
  return Array.from({ length: count }, (_, index) =>
    logged.has(addDays(today, -(count - 1 - index))),
  )
}

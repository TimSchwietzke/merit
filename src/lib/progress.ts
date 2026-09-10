import { addDays } from '@/lib/date'
import { weekOf } from '@/lib/schedule'
import { performed, volume, type SessionSets } from '@/lib/training'

/**
 * What training looks like over a stretch of weeks (GOAL.md §2.1).
 *
 * Weeks, not days: a person training four times a week has three empty days in
 * every seven, and a daily series of a training habit is mostly zeroes. The
 * week is the unit the plan is written in (`routine_days` is a weekday pattern)
 * so it is the unit the progress is read in.
 *
 * Only performed sets count, here as everywhere. A planned set that was never
 * done is not tonnage.
 */
export interface WeekPoint {
  /** Monday of the week, as a day key. */
  week: string
  /** Sum of reps × weight across every performed set in the week. */
  volumeKg: number
  /** Days in the week with at least one performed set. */
  sessions: number
}

/**
 * The last `weeks` weeks ending with the one `today` falls in, oldest first.
 *
 * Weeks with no training are present and zero rather than absent. A gap is a
 * fact about the training and a chart that closes over it tells a nicer story
 * than the one that happened.
 */
export function weeklyVolume(
  sessions: readonly SessionSets[],
  today: string,
  weeks = 8,
): WeekPoint[] {
  const thisMonday = weekOf(today)[0]
  const points: WeekPoint[] = []

  for (let back = weeks - 1; back >= 0; back--) {
    const week = addDays(thisMonday, -7 * back)
    const end = addDays(week, 6)
    const inWeek = sessions.filter((session) => session.date >= week && session.date <= end)

    points.push({
      week,
      volumeKg: inWeek.reduce((sum, session) => sum + volume(session.sets), 0),
      sessions: inWeek.filter((session) => performed(session.sets).length > 0).length,
    })
  }

  return points
}

/**
 * How the latest week compares with the average of the ones before it, as a
 * fraction — `0.12` is twelve percent above.
 *
 * Against the mean of the earlier weeks rather than against last week alone: a
 * single light week would otherwise make the next one look like a breakthrough.
 * Null when there is nothing to compare against, which is not the same as zero
 * and must not be rendered as a flat line.
 */
export function trend(points: readonly WeekPoint[]): number | null {
  if (points.length < 2) return null
  const earlier = points.slice(0, -1)
  const base = earlier.reduce((sum, point) => sum + point.volumeKg, 0) / earlier.length
  if (base === 0) return null
  return (points[points.length - 1].volumeKg - base) / base
}

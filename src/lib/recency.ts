import { MUSCLE_REGIONS } from '@/components/muscle-paths'
import { daysBetween } from '@/lib/date'
import type { ExerciseRef } from '@/features/training/useWorkout'
import { onBody } from '@/lib/muscles'
import { performed, type SessionSets } from '@/lib/training'

/**
 * How long ago each part of the body was last trained.
 *
 * The one question a dashboard can answer that no single tab can: not what you
 * did, but what you have not done. "Legs, nine days ago" is a fact somebody can
 * act on this afternoon, and it is invisible on every other screen because
 * every other screen is about one day or one routine.
 *
 * Only performed sets count. A planned session that never happened did not
 * train anything, and a body map that says otherwise is worse than no map.
 */

/** How faint a region gets before it is simply cold. */
export const COLD_AFTER_DAYS = 7

/**
 * Days since each body region was last worked, by silhouette slug. A region
 * missing from the map has never been trained in the window.
 */
export function daysSinceWorked(
  history: readonly SessionSets[],
  exercises: ReadonlyMap<string, ExerciseRef>,
  today: string,
): Map<string, number> {
  const last = new Map<string, string>()

  for (const session of history) {
    for (const set of performed(session.sets)) {
      const exercise = exercises.get(set.exerciseId)
      if (!exercise) continue
      // Secondary muscles count too: a bench press works triceps whether or not
      // anybody planned it as a triceps day.
      for (const region of onBody([...exercise.primaryMuscles, ...exercise.secondaryMuscles])) {
        const seen = last.get(region)
        if (!seen || session.date > seen) last.set(region, session.date)
      }
    }
  }

  const days = new Map<string, number>()
  for (const [region, date] of last) days.set(region, Math.max(0, daysBetween(date, today)))
  return days
}

/**
 * How brightly a region should read, from 1 for trained today down to 0 for
 * cold.
 *
 * Linear over a week rather than stepped: the question is "how long ago", which
 * is continuous, and three buckets would make day three and day five look
 * identical when they are not. Undefined — never trained — is 0, the same as a
 * fortnight ago, because past a week the distinction stops being useful and
 * starts being a reproach.
 */
export function glow(days: number | undefined): number {
  if (days === undefined) return 0
  return Math.max(0, 1 - days / COLD_AFTER_DAYS)
}

/**
 * The region that has waited longest, for the line under the map.
 *
 * A region absent from the map has had nothing at all in the window, which is
 * the *most* neglected state rather than an unknown — somebody who has never
 * trained legs is exactly who this line is for. It sorts above every region
 * that has a number, and carries `days: null` to say so.
 */
export function coldest(
  days: ReadonlyMap<string, number>,
  regions: readonly string[] = MUSCLE_REGIONS,
): { region: string; days: number | null } | null {
  const never = regions.find((region) => !days.has(region))
  if (never !== undefined) return { region: never, days: null }

  let worst: { region: string; days: number } | null = null
  for (const [region, since] of days) {
    if (!worst || since > worst.days) worst = { region, days: since }
  }
  return worst
}

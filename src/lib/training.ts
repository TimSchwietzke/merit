import { addDays, daysBetween, parseDateKey } from '@/lib/date'
/**
 * The training maths (CLAUDE.md, Code).
 *
 * The figure this file exists for is the comparison line: what was done last
 * time for the same exercise. DESIGN.md §10.10 calls it "the reason anyone
 * opens the training tab between sets", and it is not optional detail.
 */

export interface LoggedSet {
  id: string
  exerciseId: string
  setNumber: number
  reps: number
  weightKg: number
  rir: number | null
  /** False for a set a routine planned that has not been performed yet. */
  done: boolean
}

export interface SessionSets {
  /** Day key. */
  date: string
  sets: LoggedSet[]
}

/** One line of a summary: three sets of eight at sixty kilos. */
export interface SetGroup {
  sets: number
  reps: number
  weightKg: number
}

/** Only what actually happened. A plan is not an achievement. */
export const performed = (sets: readonly LoggedSet[]) => sets.filter((set) => set.done)

/**
 * Collapse a list of sets into the shape people say out loud — `3 × 8 @ 60 kg`.
 *
 * Only *consecutive* sets are collapsed. 8/8/6 at the same weight is two lines,
 * not one, because the drop is the interesting part; merging by value would
 * report it as `2 × 8` and `1 × 6` and lose the order it happened in.
 */
export function groupSets(sets: readonly LoggedSet[]): SetGroup[] {
  const ordered = [...sets].sort((a, b) => a.setNumber - b.setNumber)
  const groups: SetGroup[] = []

  for (const set of ordered) {
    const last = groups[groups.length - 1]
    if (last && last.reps === set.reps && last.weightKg === set.weightKg) last.sets += 1
    else groups.push({ sets: 1, reps: set.reps, weightKg: set.weightKg })
  }

  return groups
}

/**
 * The most recent session before `date` that included this exercise.
 *
 * Strictly before: on the day itself the sets already on screen are the answer,
 * and comparing today with today says nothing.
 */
export function lastSessionFor(
  sessions: readonly SessionSets[],
  exerciseId: string,
  date: string,
): { date: string; sets: LoggedSet[] } | null {
  let best: { date: string; sets: LoggedSet[] } | null = null

  for (const session of sessions) {
    if (session.date >= date) continue
    const sets = session.sets.filter((set) => set.exerciseId === exerciseId && set.done)
    if (sets.length === 0) continue
    if (!best || session.date > best.date) best = { date: session.date, sets }
  }

  return best
}

/**
 * Reps times weight, summed. The plainest measure of how much work a session
 * was, and the only one that needs no assumptions about anybody's maximum.
 */
export function volume(sets: readonly LoggedSet[]): number {
  return performed(sets).reduce((total, set) => total + set.reps * set.weightKg, 0)
}

/** The next set number for an exercise: one past the highest already logged. */
export function nextSetNumber(sets: readonly LoggedSet[], exerciseId: string): number {
  const mine = sets.filter((set) => set.exerciseId === exerciseId)
  return mine.reduce((highest, set) => Math.max(highest, set.setNumber), 0) + 1
}

/**
 * The set to offer next: the last one logged for this exercise, repeated.
 *
 * Between sets, the overwhelmingly common answer is "the same again", so the
 * form opens on it and typing is only needed when something changed.
 */
export function repeatOf(sets: readonly LoggedSet[], exerciseId: string): LoggedSet | null {
  const mine = performed(sets).filter((set) => set.exerciseId === exerciseId)
  if (mine.length === 0) return null
  return mine.reduce((latest, set) => (set.setNumber > latest.setNumber ? set : latest))
}

/** ISO weekday of a day key: 1 = Monday … 7 = Sunday. */
export function isoWeekday(date: string): number {
  return ((parseDateKey(date).getDay() + 6) % 7) + 1
}

/** A routine and the weekdays it is planned for. */
export interface PlannedDay {
  id: string
  name: string
  weekdays: number[]
}

/**
 * The next planned session on or after a day, and how many days away it is.
 *
 * Searches a fortnight, which is more than a weekly plan can need and stops the
 * loop from running forever when nothing is planned at all. Today counts: a
 * session due today is nought days away, not seven.
 */
export function nextSession(
  plan: readonly PlannedDay[],
  date: string,
): { day: PlannedDay; inDays: number } | null {
  for (let offset = 0; offset <= 14; offset += 1) {
    const weekday = isoWeekday(addDays(date, offset))
    const match = plan.find((entry) => entry.weekdays.includes(weekday))
    if (match) return { day: match, inDays: offset }
  }
  return null
}

/**
 * Whether the plan is paused on a given day. The date is the last day of the
 * pause, so a fortnight away is not a fortnight of missed sessions.
 */
export function planPaused(pausedUntil: string | null | undefined, date: string): boolean {
  // Any absent value, not just `null`. A profile row read before this column
  // existed comes back with the field missing, and `undefined !== null` is
  // true — which sent an undefined into a date parser and took the dashboard
  // down with it.
  if (!pausedUntil) return false
  return daysBetween(date, pausedUntil) >= 0
}

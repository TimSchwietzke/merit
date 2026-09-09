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
    const sets = session.sets.filter((set) => set.exerciseId === exerciseId)
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
  return sets.reduce((total, set) => total + set.reps * set.weightKg, 0)
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
  const mine = sets.filter((set) => set.exerciseId === exerciseId)
  if (mine.length === 0) return null
  return mine.reduce((latest, set) => (set.setNumber > latest.setNumber ? set : latest))
}

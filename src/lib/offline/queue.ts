/**
 * The outbox: writes that have been made and not yet sent.
 *
 * Every training write goes in here first and is sent from here, online or
 * off. One path rather than two means there is no "offline mode" to get into
 * or out of, nothing that behaves differently in a basement than it did in the
 * car park, and no branch that only runs where it cannot be tested.
 *
 * The rules below are about what the *server* eventually sees. A set logged
 * and deleted before the connection came back was never anybody's business but
 * this device's, and replaying both would be two round trips to arrive where
 * doing nothing arrives.
 */

export type Pending =
  /** A day's workout. Upserted by id, so replaying it twice is harmless. */
  | { seq: number; kind: 'workout'; id: string; date: string; routineId: string | null }
  | {
      seq: number
      kind: 'set'
      id: string
      workoutId: string
      exerciseId: string
      setNumber: number
      reps: number
      weightKg: number
      rir: number | null
      done: boolean
    }
  | {
      seq: number
      kind: 'setPatch'
      id: string
      values: { reps: number; weightKg: number; rir: number | null; done?: boolean }
    }
  | { seq: number; kind: 'setDelete'; id: string }
  /** Finishing a day, or taking it back up. */
  | { seq: number; kind: 'end'; date: string; endedAt: string | null }

/**
 * The same queue with the round trips nobody needs taken out.
 *
 * Two collapses, both about a set the server has never heard of:
 *
 *   insert … delete   both go. The set existed on this device and nowhere else.
 *   insert … patch    the patch is folded into the insert, so one row is sent
 *                     carrying what it ended up as rather than what it started
 *                     as. This is the ordinary case of a planned set: it is
 *                     written when a routine starts and again when it is
 *                     actually done.
 *
 * A patch or a delete against a set that *was* sent stays as it is: the server
 * has the row and has to be told.
 */
export function collapse(queue: readonly Pending[]): Pending[] {
  const inserted = new Set(queue.filter((entry) => entry.kind === 'set').map((entry) => entry.id))

  const deleted = new Set(
    queue.flatMap((entry) =>
      entry.kind === 'setDelete' && inserted.has(entry.id) ? [entry.id] : [],
    ),
  )

  const out: Pending[] = []
  for (const entry of queue) {
    if (
      (entry.kind === 'set' || entry.kind === 'setPatch' || entry.kind === 'setDelete') &&
      deleted.has(entry.id)
    ) {
      continue
    }

    if (entry.kind === 'setPatch' && inserted.has(entry.id)) {
      // Fold it into the insert that is still waiting ahead of it.
      const target = out.find((candidate) => candidate.kind === 'set' && candidate.id === entry.id)
      if (target && target.kind === 'set') {
        target.reps = entry.values.reps
        target.weightKg = entry.values.weightKg
        target.rir = entry.values.rir
        if (entry.values.done !== undefined) target.done = entry.values.done
        continue
      }
    }

    // Copied, never mutated in place: the queue passed in belongs to the
    // database and is read again on the next flush if this one does not finish.
    out.push({ ...entry })
  }
  return out
}

/** Every set id the queue still has unsent work for, for the "not synced" mark. */
export function pendingSetIds(queue: readonly Pending[]): Set<string> {
  const ids = new Set<string>()
  for (const entry of queue) {
    if (entry.kind === 'set' || entry.kind === 'setPatch' || entry.kind === 'setDelete') {
      ids.add(entry.id)
    }
  }
  return ids
}

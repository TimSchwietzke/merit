import { db } from '@/lib/offline/db'
import { collapse, type Pending } from '@/lib/offline/queue'
import { supabase } from '@/lib/supabase'

/**
 * Sending the outbox.
 *
 * `clean` means the server has everything. `offline` means it does not and the
 * queue is intact, which is not an error and is never shown as one: it is
 * Tuesday in a gym basement. `rejected` means the server refused something and
 * that entry is gone, which is the only case anybody needs telling about.
 */
export type FlushResult = 'clean' | 'offline' | 'rejected'

/**
 * A refusal, as opposed to a connection that is not there.
 *
 * PostgREST answers a refusal with a body carrying a code; a phone with no
 * signal produces a `TypeError` from `fetch` and no code at all. The
 * difference decides whether an entry is dropped or kept, so it is read from
 * the shape of the error rather than from `navigator.onLine`, which reports a
 * connected wifi with no route to anywhere as being online.
 */
const refused = (error: { code?: string } | null): boolean =>
  Boolean(error?.code) && error?.code !== 'PGRST301'

async function send(entry: Pending, userId: string): Promise<{ code?: string } | null> {
  switch (entry.kind) {
    case 'workout': {
      // Upserted on the primary key, which this device chose: replaying it
      // after a connection dropped mid-flush writes the same row again rather
      // than a second one.
      const { error } = await supabase.from('workouts').upsert({
        id: entry.id,
        user_id: userId,
        date: entry.date,
        routine_id: entry.routineId,
      })
      return error
    }
    case 'set': {
      const { error } = await supabase.from('workout_sets').upsert({
        id: entry.id,
        workout_id: entry.workoutId,
        user_id: userId,
        exercise_id: entry.exerciseId,
        set_number: entry.setNumber,
        reps: entry.reps,
        weight_kg: entry.weightKg,
        rir: entry.rir,
        done: entry.done,
      })
      return error
    }
    case 'setPatch': {
      const { error } = await supabase
        .from('workout_sets')
        .update({
          reps: entry.values.reps,
          weight_kg: entry.values.weightKg,
          rir: entry.values.rir,
          ...(entry.values.done === undefined ? {} : { done: entry.values.done }),
        })
        .eq('id', entry.id)
        .eq('user_id', userId)
      return error
    }
    case 'setDelete': {
      // No row matched is a success here, not a failure: it means the delete
      // already went through before the connection dropped.
      const { error } = await supabase
        .from('workout_sets')
        .delete()
        .eq('id', entry.id)
        .eq('user_id', userId)
      return error
    }
    case 'end': {
      const { error } = await supabase
        .from('workouts')
        .update({ ended_at: entry.endedAt })
        .eq('user_id', userId)
        .eq('date', entry.date)
      return error
    }
  }
}

/** One flush at a time, however many callers ask for one. */
let running: Promise<FlushResult> | null = null

export function flush(userId: string): Promise<FlushResult> {
  running ??= run(userId).finally(() => {
    running = null
  })
  return running
}

async function run(userId: string): Promise<FlushResult> {
  const queue = await db.outbox.orderBy('seq').toArray()
  if (queue.length === 0) return 'clean'

  // Collapsed in the database rather than only on the way out, so a flush that
  // stops halfway leaves the shortened queue behind rather than the long one.
  const collapsed = collapse(queue)
  const kept = new Set(collapsed.map((entry) => entry.seq))
  await db.transaction('rw', db.outbox, async () => {
    await db.outbox.bulkDelete(queue.filter((entry) => !kept.has(entry.seq)).map((e) => e.seq))
    await db.outbox.bulkPut(collapsed)
  })

  let result: FlushResult = 'clean'
  for (const entry of collapsed) {
    const error = await send(entry, userId)
    if (!error) {
      await db.outbox.delete(entry.seq)
      continue
    }
    // Refused: the entry will be refused again every time, and a queue with
    // one poisoned entry at the front stops everything behind it forever.
    if (refused(error)) {
      console.warn('merit: a training write was refused and dropped', entry.kind, error)
      await db.outbox.delete(entry.seq)
      result = 'rejected'
      continue
    }
    // No connection. Everything still queued stays queued, in order.
    return 'offline'
  }

  return result
}

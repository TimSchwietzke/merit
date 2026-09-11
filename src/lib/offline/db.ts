import Dexie, { type Table } from 'dexie'

import type { Pending } from '@/lib/offline/queue'

/**
 * The training log, on this device.
 *
 * GOAL.md §5: gym basements have no signal, and a set logged there has to land
 * somewhere durable before it lands on a server. IndexedDB through Dexie, per
 * CLAUDE.md hard rule 4, never `localStorage`, which is synchronous, small,
 * and the wrong place for application data.
 *
 * Two tables and a note of whose they are:
 *
 *   sets    a mirror of the window `useWorkout` reads, kept in the shape the
 *           server sends it so there is one row type rather than two.
 *   outbox  writes that have not been sent yet. See `queue.ts`.
 *   meta    which account the two above belong to.
 *
 * Nutrition stays online: scanning a barcode needs the network anyway, so
 * mirroring the food log would be work in aid of a case that cannot happen.
 */

export interface SetRow {
  id: string
  set_number: number
  reps: number
  weight_kg: number
  rir: number | null
  done: boolean
  exercise_id: string
  workouts: { id: string; date: string; ended_at: string | null; routine_id: string | null }
  exercises: {
    id: string
    name_en: string
    name_de: string
    muscle_group: string
    equipment: string
    primary_muscles: string[]
    secondary_muscles: string[]
  }
}

class MeritDb extends Dexie {
  sets!: Table<SetRow, string>
  outbox!: Table<Pending, number>
  meta!: Table<{ key: string; value: string }, string>

  constructor() {
    super('merit')
    // Only `sets` is queried by anything but its key, and it is read whole:
    // a hundred and eighty days of one person's sets is a few thousand rows,
    // which is a smaller thing to read than an index is to keep.
    this.version(1).stores({ sets: 'id', outbox: '++seq', meta: 'key' })
  }
}

export const db = new MeritDb()

/**
 * Make sure what is stored belongs to the account that is signed in.
 *
 * Two people sharing a phone would otherwise see each other's training, which
 * is health data on a device neither of them chose to put it on.
 *
 * ponytail: a change of owner drops the outbox as well, so a set logged
 * offline by somebody who then signs out and hands the phone over is lost
 * rather than sent late. Keeping per-account outboxes would fix that; nobody
 * has met the case, and the leak is the more serious of the two.
 */
export async function claimFor(userId: string): Promise<void> {
  const owner = await db.meta.get('owner')
  if (owner?.value === userId) return

  await db.transaction('rw', db.sets, db.outbox, db.meta, async () => {
    await db.sets.clear()
    await db.outbox.clear()
    await db.meta.put({ key: 'owner', value: userId })
  })
}

/** Everything this device holds, gone. Signing out, and deleting an account. */
export async function forgetDevice(): Promise<void> {
  await db.transaction('rw', db.sets, db.outbox, db.meta, async () => {
    await db.sets.clear()
    await db.outbox.clear()
    await db.meta.clear()
  })
}

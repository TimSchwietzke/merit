import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'

import { useSession } from '@/features/auth/useSession'
import { addDays } from '@/lib/date'
import { claimFor, db, type SetRow } from '@/lib/offline/db'
import { pendingSetIds, type Pending } from '@/lib/offline/queue'
import { flush, type FlushResult } from '@/lib/offline/sync'
import { supabase } from '@/lib/supabase'
import type { LoggedSet, SessionSets } from '@/lib/training'

/**
 * A training day, and enough history behind it to answer "what did I do last
 * time" without a second round trip.
 *
 * One query covers both. The comparison line needs the previous session for
 * every exercise on screen, and fetching that per exercise would be a request
 * per block on a gym connection — so a window of recent sets comes back at once
 * and the maths slices it (`lastSessionFor`).
 *
 * **Every write lands on the device first** (GOAL.md §5). A set is written to
 * IndexedDB and queued, the screen reads back from IndexedDB, and the queue is
 * what talks to the server. There is no offline mode to enter or leave and no
 * second code path that only runs where nobody can test it: a basement is the
 * ordinary case running with the network step pending, which is why the
 * optimistic update and the durable one are the same write.
 *
 * What that does not cover is starting a routine the device has never loaded:
 * the routine list is not mirrored, so a session has to be started somewhere
 * with a signal. Logging it afterwards needs none.
 */
/** The columns every exercise query selects. One list, so none of them drifts. */
export const EXERCISE_COLUMNS =
  'id, name_en, name_de, muscle_group, equipment, primary_muscles, secondary_muscles'

/** A row of those columns, in the shape the app uses. */
export function toExerciseRef(row: {
  id: string
  name_en: string
  name_de: string
  muscle_group: string
  equipment: string
  primary_muscles: string[]
  secondary_muscles: string[]
}): ExerciseRef {
  return {
    id: row.id,
    nameEn: row.name_en,
    nameDe: row.name_de,
    muscleGroup: row.muscle_group,
    equipment: row.equipment,
    primaryMuscles: row.primary_muscles,
    secondaryMuscles: row.secondary_muscles,
  }
}

export interface ExerciseRef {
  id: string
  nameEn: string
  nameDe: string
  muscleGroup: string
  equipment: string
  /** Catalogue muscle names. `lib/muscles` turns them into body regions. */
  primaryMuscles: string[]
  secondaryMuscles: string[]
}

export interface WorkoutState {
  /** Today's sets, in the order they were logged. */
  sets: LoggedSet[]
  /** Every exercise appearing in the window, by id. */
  exercises: Map<string, ExerciseRef>
  /** Earlier days, for the comparison line. */
  history: SessionSets[]
  /** When this day's session was finished, or null while it is still running. */
  endedAt: string | null
  /** Finish the day's session, or take it back up again. */
  setEnded: (ended: boolean) => Promise<boolean>
  status: 'loading' | 'ready' | 'error'
  /** Written here, not sent yet. Not an error: a basement is not a fault. */
  offline: boolean
  /** Sets the server has not been told about, for the mark on the row. */
  unsent: Set<string>
  /** Something was refused outright and dropped. The one case worth saying. */
  rejected: boolean
  addSet: (set: {
    exerciseId: string
    reps: number
    weightKg: number
    rir: number | null
    done?: boolean
  }) => Promise<boolean>
  updateSet: (
    id: string,
    values: { reps: number; weightKg: number; rir: number | null; done?: boolean },
  ) => Promise<boolean>
  removeSet: (id: string) => Promise<boolean>
  /** Write a routine's planned sets onto a day — this one unless told another. */
  startRoutine: (plan: {
    routineId: string
    /** Reps per set, in order — the plan says what each set is, not how many. */
    exercises: { exerciseId: string; setReps: number[] }[]
    forDate?: string
  }) => Promise<boolean>
}

/** How far back the comparison line is allowed to reach. */
const WINDOW_DAYS = 180

/**
 * One version number for every caller of this hook.
 *
 * There are three — the session bar's provider, the day screen and the session
 * preview — and each used to hold its own private counter, so a write made
 * through one was invisible to the others until something remounted them.
 *
 * A write is a write. Whoever makes it, everyone reading the same table hears
 * about it.
 */
let version = 0
const listeners = new Set<() => void>()

function published() {
  version += 1
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  // A connection coming back is the other thing that changes what is on
  // screen, because the queue drains and the marks come off the rows.
  window.addEventListener('online', published)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('online', published)
  }
}

const SELECT = `id, set_number, reps, weight_kg, rir, done, exercise_id,
  workouts!inner (id, date, ended_at, routine_id),
  exercises!inner (${EXERCISE_COLUMNS})`

/**
 * One request per window in flight, however many callers want it.
 *
 * The session bar's provider sits above the router and reads today's sets, and
 * so does whichever screen is mounted — so every screen was fetching a hundred
 * and eighty days of sets twice. This is the heaviest query in the app and
 * PRODUCT.md's third principle is that the connection is bad.
 */
const inFlight = new Map<string, Promise<SetRow[]>>()

function fetchWindow(from: string, to: string, version: number): Promise<SetRow[]> {
  const key = `${from}:${to}:${version}`
  const running = inFlight.get(key)
  if (running) return running

  // `Promise.resolve`: PostgREST's builder is a thenable, not a Promise, so it
  // has `.then` and nothing else.
  const request = Promise.resolve(
    supabase
      .from('workout_sets')
      .select(SELECT)
      .gte('workouts.date', from)
      .lte('workouts.date', to)
      .order('created_at'),
  )
    .then(({ data, error }) => {
      if (error || !data) throw error ?? new Error('no rows')
      return data as unknown as SetRow[]
    })
    .finally(() => inFlight.delete(key))

  inFlight.set(key, request)
  return request
}

const toSet = (row: SetRow): LoggedSet => ({
  id: row.id,
  exerciseId: row.exercise_id,
  setNumber: row.set_number,
  reps: row.reps,
  weightKg: row.weight_kg,
  rir: row.rir,
  done: row.done,
})

/**
 * Dexie fills `seq` itself; nothing else may.
 *
 * Distributed over the union rather than `Omit<Pending, 'seq'>`, which would
 * collapse five different entries into the keys they have in common.
 */
type Entry = Pending extends infer T ? (T extends Pending ? Omit<T, 'seq'> : never) : never
const enqueue = (entry: Entry) => db.outbox.add(entry as Pending)

export function useWorkout(date: string): WorkoutState {
  const { session } = useSession()
  const userId = session?.user.id

  const [state, setState] = useState<{
    rows: SetRow[]
    unsent: Set<string>
    sync: FlushResult
  } | null>(null)
  const [failed, setFailed] = useState(false)
  // Bumped by any write from any caller, which is what re-runs the read. A
  // reload function called from the effect would be a state write the effect
  // owns; a token is the same reload expressed as a dependency.
  const shared = useSyncExternalStore(subscribe, () => version)
  const rowsRef = useRef<SetRow[]>([])

  useEffect(() => {
    if (!userId) return
    let active = true
    const from = addDays(date, -WINDOW_DAYS)

    async function load() {
      // Whatever is stored belongs to whoever is signed in, or it goes.
      await claimFor(userId as string)

      // Send before reading. A fetch that overtook the queue would answer with
      // a day that is missing the set just logged, and the screen would blink
      // it away and bring it back.
      const sync = await flush(userId as string)

      if (sync !== 'offline') {
        try {
          const fetched = await fetchWindow(from, date, shared)
          const unsentIds = pendingSetIds(await db.outbox.toArray())
          const arrived = new Set(fetched.map((row) => row.id))

          await db.transaction('rw', db.sets, async () => {
            // Gone from the window on the server is gone here, unless this
            // device is the one that has not said so yet. Rows outside the
            // window are left alone: browsing to March must not empty today.
            const stale = (await db.sets.toArray()).filter(
              (row) =>
                row.workouts.date >= from &&
                row.workouts.date <= date &&
                !arrived.has(row.id) &&
                !unsentIds.has(row.id),
            )
            await db.sets.bulkDelete(stale.map((row) => row.id))
            // A row this device has unsent work for is not overwritten by the
            // server's copy of it: the read can have left before the write it
            // does not know about yet, and the newer of the two is here.
            await db.sets.bulkPut(fetched.filter((row) => !unsentIds.has(row.id)))
          })
        } catch {
          // The queue was empty enough to try and the read still did not come
          // back. What is on the device is what there is.
          if (active) setFailed(true)
        }
      }

      const rows = await db.sets.toArray()
      const unsent = pendingSetIds(await db.outbox.toArray())
      if (!active) return
      rowsRef.current = rows
      setState({ rows, unsent, sync })
      if (rows.length > 0 || sync === 'offline') setFailed(false)
    }

    void load()

    return () => {
      active = false
    }
  }, [userId, date, shared])

  // Loaded means the device has been read, which it always can be. `error` is
  // for a first run that has nothing stored and could not reach the server.
  const status: WorkoutState['status'] =
    state === null ? 'loading' : failed && state.rows.length === 0 ? 'error' : 'ready'

  const all = state?.rows ?? []
  const today = all.filter((row) => row.workouts.date === date)
  const sets = today.map(toSet)
  // Every set of a day hangs off one workout, so the first row answers for it.
  const endedAt = today[0]?.workouts.ended_at ?? null

  const exercises = new Map<string, ExerciseRef>()
  for (const row of all) exercises.set(row.exercises.id, toExerciseRef(row.exercises))

  const byDate = new Map<string, LoggedSet[]>()
  for (const row of all) {
    const day = byDate.get(row.workouts.date) ?? []
    day.push(toSet(row))
    byDate.set(row.workouts.date, day)
  }
  const history: SessionSets[] = [...byDate].map(([day, daySets]) => ({ date: day, sets: daySets }))

  /**
   * The exercise as this device knows it.
   *
   * From the window first, which holds every lift the user has touched in half
   * a year. A lift that is new to them has just been picked out of the
   * catalogue, which is a screen that needed the network anyway, so asking for
   * it here is asking at a moment there is a connection.
   */
  const exerciseRow = useCallback(async (exerciseId: string): Promise<SetRow['exercises'] | null> => {
    const known = rowsRef.current.find((row) => row.exercise_id === exerciseId)
    if (known) return known.exercises

    const { data } = await supabase
      .from('exercises')
      .select(EXERCISE_COLUMNS)
      .eq('id', exerciseId)
      .maybeSingle()
    return (data as SetRow['exercises'] | null) ?? null
  }, [])

  /** The workout a set logged on this day belongs to, made if there is none. */
  const workoutFor = useCallback(
    async (on: string, routineId: string | null = null): Promise<SetRow['workouts']> => {
      const existing = rowsRef.current.find(
        (row) => row.workouts.date === on && (routineId === null || row.workouts.routine_id === routineId),
      )
      if (existing) return existing.workouts

      const workout = {
        id: crypto.randomUUID(),
        date: on,
        ended_at: null,
        routine_id: routineId,
      }
      await enqueue({ kind: 'workout', id: workout.id, date: on, routineId })
      return workout
    },
    [],
  )

  const addSet = useCallback(
    async (set: {
      exerciseId: string
      reps: number
      weightKg: number
      rir: number | null
      done?: boolean
    }) => {
      if (!userId) return false

      const exercise = await exerciseRow(set.exerciseId)
      // Offline and never lifted before: the catalogue it would come from is
      // not on this device either, so this is said rather than half-done.
      if (!exercise) return false

      // The day's workout is made on the first set rather than when the screen
      // opens, so browsing a day never leaves an empty session behind.
      const workout = await workoutFor(date)

      const existing = rowsRef.current.filter(
        (row) => row.workouts.date === date && row.exercise_id === set.exerciseId,
      )
      const setNumber = existing.reduce((highest, row) => Math.max(highest, row.set_number), 0) + 1

      const row: SetRow = {
        id: crypto.randomUUID(),
        set_number: setNumber,
        reps: set.reps,
        weight_kg: set.weightKg,
        rir: set.rir,
        // A set added by hand is one being done now, not one being planned.
        done: set.done ?? true,
        exercise_id: set.exerciseId,
        workouts: workout,
        exercises: exercise,
      }

      await db.sets.put(row)
      await enqueue({
        kind: 'set',
        id: row.id,
        workoutId: workout.id,
        exerciseId: row.exercise_id,
        setNumber: row.set_number,
        reps: row.reps,
        weightKg: row.weight_kg,
        rir: row.rir,
        done: row.done,
      })
      published()
      return true
    },
    [userId, date, exerciseRow, workoutFor],
  )

  const updateSet = useCallback(
    async (
      id: string,
      values: { reps: number; weightKg: number; rir: number | null; done?: boolean },
    ) => {
      if (!userId) return false
      const row = await db.sets.get(id)
      if (!row) return false

      await db.sets.put({
        ...row,
        reps: values.reps,
        weight_kg: values.weightKg,
        rir: values.rir,
        done: values.done ?? row.done,
      })
      await enqueue({ kind: 'setPatch', id, values })
      published()
      return true
    },
    [userId],
  )

  const removeSet = useCallback(
    async (id: string) => {
      if (!userId) return false
      await db.sets.delete(id)
      await enqueue({ kind: 'setDelete', id })
      published()
      return true
    },
    [userId],
  )

  /**
   * Finish the day's session, or take it back up.
   *
   * A write, not a flag: the button used to set React state, so a reload
   * recomputed "running" from the still-unlogged sets and the bar came back —
   * which read as the button doing nothing.
   */
  const setEnded = useCallback(
    async (ended: boolean) => {
      if (!userId) return false
      const endedAt = ended ? new Date().toISOString() : null

      const affected = rowsRef.current.filter((row) => row.workouts.date === date)
      await db.sets.bulkPut(
        affected.map((row) => ({ ...row, workouts: { ...row.workouts, ended_at: endedAt } })),
      )
      await enqueue({ kind: 'end', date, endedAt })
      published()
      return true
    },
    [userId, date],
  )

  /**
   * Materialise a routine's plan as real, not-yet-done sets.
   *
   * Weight comes from the last time each exercise was actually performed, so
   * the session opens as something to confirm rather than something to fill in
   * — and so progress is visible at the moment of lifting rather than looked up
   * afterwards. An exercise never done before starts at zero, which is a real
   * weight and the right one for a bodyweight movement.
   */
  const startRoutine = useCallback(
    async (plan: {
      routineId: string
      exercises: { exerciseId: string; setReps: number[] }[]
      forDate?: string
    }) => {
      if (!userId) return false
      const on = plan.forDate ?? date

      // Started already: its sets are what they are, and rewriting them would
      // throw away everything logged so far. It still publishes — the caller is
      // about to navigate to those sets, and a reader that was mounted before
      // they existed has no other way to learn about them.
      const started = rowsRef.current.some(
        (row) => row.workouts.date === on && row.workouts.routine_id === plan.routineId,
      )
      if (started) {
        published()
        return true
      }

      const refs = new Map<string, SetRow['exercises']>()
      for (const entry of plan.exercises) {
        const exercise = await exerciseRow(entry.exerciseId)
        if (!exercise) return false
        refs.set(entry.exerciseId, exercise)
      }

      const workout = await workoutFor(on, plan.routineId)

      const lastWeight = (exerciseId: string): number => {
        const earlier = rowsRef.current
          .filter((row) => row.exercise_id === exerciseId && row.done && row.workouts.date < on)
          .sort((a, b) => b.workouts.date.localeCompare(a.workouts.date))
        return earlier[0]?.weight_kg ?? 0
      }

      const rows: SetRow[] = plan.exercises.flatMap((entry) =>
        entry.setReps.map((reps, index) => ({
          id: crypto.randomUUID(),
          set_number: index + 1,
          reps,
          weight_kg: lastWeight(entry.exerciseId),
          rir: null,
          // Planned, not performed. It becomes true when it is logged.
          done: false,
          exercise_id: entry.exerciseId,
          workouts: workout,
          exercises: refs.get(entry.exerciseId) as SetRow['exercises'],
        })),
      )

      await db.sets.bulkPut(rows)
      for (const row of rows) {
        await enqueue({
          kind: 'set',
          id: row.id,
          workoutId: workout.id,
          exerciseId: row.exercise_id,
          setNumber: row.set_number,
          reps: row.reps,
          weightKg: row.weight_kg,
          rir: row.rir,
          done: row.done,
        })
      }

      published()
      return true
    },
    [userId, date, exerciseRow, workoutFor],
  )

  return {
    sets,
    exercises,
    history,
    status,
    endedAt,
    offline: state?.sync === 'offline',
    unsent: state?.unsent ?? new Set(),
    rejected: state?.sync === 'rejected',
    setEnded,
    addSet,
    updateSet,
    removeSet,
    startRoutine,
  }
}

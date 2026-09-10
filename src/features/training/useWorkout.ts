import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'

import { useSession } from '@/features/auth/useSession'
import { addDays } from '@/lib/date'
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
 */
export interface ExerciseRef {
  id: string
  nameEn: string
  nameDe: string
  muscleGroup: string
  equipment: string
}

export interface WorkoutState {
  /** Today's sets, in the order they were logged. */
  sets: LoggedSet[]
  /** Every exercise appearing in the window, by id. */
  exercises: Map<string, ExerciseRef>
  /** Earlier days, for the comparison line. */
  history: SessionSets[]
  status: 'loading' | 'ready' | 'error'
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
 * Starting a routine from the preview wrote the sets and told nobody: the bar
 * sat hidden until the page was reloaded, because the provider's query had no
 * reason to run again.
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
  return () => {
    listeners.delete(listener)
  }
}

const SELECT = `id, set_number, reps, weight_kg, rir, done, exercise_id,
  workouts!inner (date),
  exercises!inner (id, name_en, name_de, muscle_group, equipment)`

type Row = {
  id: string
  set_number: number
  reps: number
  weight_kg: number
  rir: number | null
  done: boolean
  exercise_id: string
  workouts: { date: string }
  exercises: {
    id: string
    name_en: string
    name_de: string
    muscle_group: string
    equipment: string
  }
}

const toSet = (row: Row): LoggedSet => ({
  id: row.id,
  exerciseId: row.exercise_id,
  setNumber: row.set_number,
  reps: row.reps,
  weightKg: row.weight_kg,
  rir: row.rir,
  done: row.done,
})

export function useWorkout(date: string): WorkoutState {
  const { session } = useSession()
  const userId = session?.user.id

  const [rows, setRows] = useState<{ date: string; rows: Row[] } | null>(null)
  const [failed, setFailed] = useState(false)
  // Bumped by any write from any caller, which is what re-runs the query. A
  // reload function called from the effect would be a state write the effect
  // owns; a token is the same reload expressed as a dependency.
  const shared = useSyncExternalStore(subscribe, () => version)
  const rowsRef = useRef<Row[]>([])

  useEffect(() => {
    if (!userId) return
    let active = true

    void supabase
      .from('workout_sets')
      .select(SELECT)
      .gte('workouts.date', addDays(date, -WINDOW_DAYS))
      .lte('workouts.date', date)
      .order('created_at')
      .then(({ data, error }) => {
        if (!active) return
        if (error || !data) {
          setFailed(true)
          return
        }
        rowsRef.current = data as unknown as Row[]
        setRows({ date, rows: rowsRef.current })
        setFailed(false)
      })

    return () => {
      active = false
    }
  }, [userId, date, shared])

  const current = rows?.date === date ? rows.rows : null
  const status: WorkoutState['status'] = failed ? 'error' : current === null ? 'loading' : 'ready'

  const sets = (current ?? []).filter((row) => row.workouts.date === date).map(toSet)

  const exercises = new Map<string, ExerciseRef>()
  for (const row of current ?? []) {
    exercises.set(row.exercises.id, {
      id: row.exercises.id,
      nameEn: row.exercises.name_en,
      nameDe: row.exercises.name_de,
      muscleGroup: row.exercises.muscle_group,
      equipment: row.exercises.equipment,
    })
  }

  const byDate = new Map<string, LoggedSet[]>()
  for (const row of current ?? []) {
    const day = byDate.get(row.workouts.date) ?? []
    day.push(toSet(row))
    byDate.set(row.workouts.date, day)
  }
  const history: SessionSets[] = [...byDate].map(([day, daySets]) => ({ date: day, sets: daySets }))

  const addSet = useCallback(
    async (set: {
      exerciseId: string
      reps: number
      weightKg: number
      rir: number | null
      done?: boolean
    }) => {
      if (!userId) return false

      // The day's workout is created on the first set rather than when the
      // screen opens, so browsing a day never leaves an empty session behind.
      const workout = await supabase
        .from('workouts')
        .upsert({ user_id: userId, date }, { onConflict: 'user_id,date' })
        .select('id')
        .single()

      if (!workout.data || workout.error) return false

      const existing = rowsRef.current.filter(
        (row) => row.workouts.date === date && row.exercise_id === set.exerciseId,
      )
      const setNumber = existing.reduce((highest, row) => Math.max(highest, row.set_number), 0) + 1

      const { error } = await supabase.from('workout_sets').insert({
        workout_id: workout.data.id,
        // Overwritten by a trigger from the workout's owner; sent because the
        // column is not null.
        user_id: userId,
        exercise_id: set.exerciseId,
        set_number: setNumber,
        reps: set.reps,
        weight_kg: set.weightKg,
        rir: set.rir,
        // A set added by hand is one being done now, not one being planned.
        done: set.done ?? true,
      })

      if (error) return false
      published()
      return true
    },
    [userId, date],
  )

  const updateSet = useCallback(
    async (
      id: string,
      values: { reps: number; weightKg: number; rir: number | null; done?: boolean },
    ) => {
      if (!userId) return false
      const { data, error } = await supabase
        .from('workout_sets')
        .update({
          reps: values.reps,
          weight_kg: values.weightKg,
          rir: values.rir,
          ...(values.done === undefined ? {} : { done: values.done }),
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select('id')
        .single()

      if (!data || error) return false
      published()
      return true
    },
    [userId],
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

      // A day can hold several workouts now, so this is an insert rather than
      // an upsert — but not a second one from the same routine, which would be
      // the same session written twice by a double tap.
      const existing = await supabase
        .from('workouts')
        .select('id')
        .eq('user_id', userId)
        .eq('date', on)
        .eq('routine_id', plan.routineId)
        .maybeSingle()

      const workout = existing.data
        ? existing
        : await supabase
            .from('workouts')
            .insert({ user_id: userId, date: on, routine_id: plan.routineId })
            .select('id')
            .single()

      if (!workout.data || workout.error) return false
      // Started already: its sets are what they are, and rewriting them would
      // throw away everything logged so far. It still publishes — the caller is
      // about to navigate to those sets, and a reader that was mounted before
      // they existed has no other way to learn about them.
      if (existing.data) {
        published()
        return true
      }
      const workoutId = workout.data.id

      const lastWeight = (exerciseId: string): number => {
        const earlier = rowsRef.current
          .filter((row) => row.exercise_id === exerciseId && row.done && row.workouts.date < on)
          .sort((a, b) => b.workouts.date.localeCompare(a.workouts.date))
        return earlier[0]?.weight_kg ?? 0
      }

      const rows = plan.exercises.flatMap((entry) =>
        entry.setReps.map((reps, index) => ({
          workout_id: workoutId,
          user_id: userId,
          exercise_id: entry.exerciseId,
          set_number: index + 1,
          reps,
          weight_kg: lastWeight(entry.exerciseId),
          rir: null,
          // Planned, not performed. It becomes true when it is logged.
          done: false,
        })),
      )

      if (rows.length > 0) {
        const { error } = await supabase.from('workout_sets').insert(rows)
        if (error) return false
      }

      published()
      return true
    },
    [userId, date],
  )

  const removeSet = useCallback(
    async (id: string) => {
      if (!userId) return false
      const { data, error } = await supabase
        .from('workout_sets')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
        .select('id')
        .single()

      if (!data || error) return false
      published()
      return true
    },
    [userId],
  )

  return { sets, exercises, history, status, addSet, updateSet, removeSet, startRoutine }
}

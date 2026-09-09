import { useCallback, useEffect, useState } from 'react'

import { useSession } from '@/features/auth/useSession'
import { supabase } from '@/lib/supabase'
import type { ExerciseRef } from '@/features/training/useWorkout'
import type { PlannedRoutine } from '@/lib/schedule'

/**
 * The user's training days (GOAL.md §5).
 *
 * A routine holds exercises in order with a target number of sets and reps, and
 * optionally the weekdays it is normally done on. The plan is weekly rather
 * than a calendar of instances: `Monday = Oberkörper 1` is the plan, and doing
 * it on Tuesday because Monday did not happen is just doing it on Tuesday.
 */
export interface RoutineExercise {
  id: string
  exerciseId: string
  position: number
  /** Reps for each set, in order. Its length is how many sets there are. */
  setReps: number[]
  exercise: ExerciseRef
}

export interface Routine {
  id: string
  name: string
  position: number
  /** ISO weekdays, 1 = Monday. */
  weekdays: number[]
  exercises: RoutineExercise[]
}

/**
 * The routines the week is built from.
 *
 * A routine with no exercises is a name and nothing else, so it is never
 * planned into a week — otherwise a day announces a session that turns out to
 * be empty when you open it. It stays in the list, marked unfinished, until it
 * has something in it.
 */
export const plannable = (routines: readonly Routine[]): PlannedRoutine[] =>
  routines
    .filter((routine) => routine.exercises.length > 0)
    .map(({ id, name, weekdays }) => ({ id, name, weekdays }))

const SELECT = `id, name, position,
  routine_days (weekday),
  routine_exercises (
    id, exercise_id, position, set_reps,
    exercises!inner (id, name_en, name_de, muscle_group, equipment)
  )`

type Row = {
  id: string
  name: string
  position: number
  routine_days: { weekday: number }[]
  routine_exercises: {
    id: string
    exercise_id: string
    position: number
    set_reps: number[]
    exercises: {
      id: string
      name_en: string
      name_de: string
      muscle_group: string
      equipment: string
    }
  }[]
}

const toRoutine = (row: Row): Routine => ({
  id: row.id,
  name: row.name,
  position: row.position,
  weekdays: row.routine_days.map((day) => day.weekday).sort((a, b) => a - b),
  exercises: [...row.routine_exercises]
    .sort((a, b) => a.position - b.position)
    .map((entry) => ({
      id: entry.id,
      exerciseId: entry.exercise_id,
      position: entry.position,
      setReps: entry.set_reps,
      exercise: {
        id: entry.exercises.id,
        nameEn: entry.exercises.name_en,
        nameDe: entry.exercises.name_de,
        muscleGroup: entry.exercises.muscle_group,
        equipment: entry.exercises.equipment,
      },
    })),
})

/** One exercise of a routine as the editor holds it, before it has been saved. */
export interface DraftExercise {
  exerciseId: string
  setReps: number[]
}

export interface RoutinesState {
  routines: Routine[]
  status: 'loading' | 'ready' | 'error'
  create: (name: string) => Promise<string | null>
  rename: (id: string, name: string) => Promise<boolean>
  remove: (id: string) => Promise<boolean>
  restore: (routine: Routine) => Promise<boolean>
  setWeekdays: (id: string, weekdays: number[]) => Promise<boolean>
  /** Replace a routine's exercises with this list, in order, in one write. */
  saveExercises: (routineId: string, exercises: readonly DraftExercise[]) => Promise<boolean>
  updateExercise: (id: string, setReps: number[]) => Promise<boolean>
  removeExercise: (id: string) => Promise<boolean>
}

/** What a new exercise starts at, so adding one needs no typing. */
export const DEFAULT_SET_REPS = [8, 8, 8]

export function useRoutines(): RoutinesState {
  const { session } = useSession()
  const userId = session?.user.id

  const [routines, setRoutines] = useState<Routine[]>([])
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [reloads, setReloads] = useState(0)
  const reload = useCallback(() => setReloads((n) => n + 1), [])

  useEffect(() => {
    if (!userId) return
    let active = true

    void supabase
      .from('routines')
      .select(SELECT)
      .order('position')
      .then(({ data, error }) => {
        if (!active) return
        if (error || !data) {
          setFailed(true)
          setLoaded(true)
          return
        }
        setRoutines((data as unknown as Row[]).map(toRoutine))
        setFailed(false)
        setLoaded(true)
      })

    return () => {
      active = false
    }
  }, [userId, reloads])

  const create = useCallback(
    async (name: string) => {
      if (!userId) return null
      const { data, error } = await supabase
        .from('routines')
        .insert({ user_id: userId, name: name.trim(), position: routines.length })
        .select('id')
        .single()
      if (!data || error) return null
      reload()
      return data.id
    },
    [userId, routines.length, reload],
  )

  const rename = useCallback(
    async (id: string, name: string) => {
      const { data, error } = await supabase
        .from('routines')
        .update({ name: name.trim() })
        .eq('id', id)
        .select('id')
        .single()
      if (!data || error) return false
      reload()
      return true
    },
    [reload],
  )

  /**
   * Put a deleted routine back, with its days and its exercises.
   *
   * A new row rather than the old one: the delete cascaded, so there is nothing
   * left to revive. Nothing outside the routine refers to those ids — a started
   * session copies the plan onto the workout — so a restored routine is the
   * same routine to everything that can see it.
   */
  const restore = useCallback(
    async (routine: Routine) => {
      if (!userId) return false
      const { data, error } = await supabase
        .from('routines')
        .insert({ user_id: userId, name: routine.name, position: routine.position })
        .select('id')
        .single()
      if (!data || error) return false

      if (routine.weekdays.length > 0) {
        const days = await supabase
          .from('routine_days')
          .insert(routine.weekdays.map((weekday) => ({ routine_id: data.id, weekday })))
        if (days.error) return false
      }
      if (routine.exercises.length > 0) {
        const rpc = await supabase.rpc('set_routine_exercises', {
          routine: data.id,
          items: routine.exercises.map((entry) => ({
            exercise_id: entry.exerciseId,
            set_reps: entry.setReps,
          })),
        })
        if (rpc.error) return false
      }
      reload()
      return true
    },
    [userId, reload],
  )

  const remove = useCallback(
    async (id: string) => {
      const { data, error } = await supabase.from('routines').delete().eq('id', id).select('id').single()
      if (!data || error) return false
      reload()
      return true
    },
    [reload],
  )

  const setWeekdays = useCallback(
    async (id: string, weekdays: number[]) => {
      // Replaced wholesale rather than diffed: the set is at most seven rows and
      // a diff is more code than the write it saves.
      const cleared = await supabase.from('routine_days').delete().eq('routine_id', id)
      if (cleared.error) return false

      if (weekdays.length > 0) {
        const { error } = await supabase
          .from('routine_days')
          .insert(weekdays.map((weekday) => ({ routine_id: id, weekday })))
        if (error) return false
      }
      reload()
      return true
    },
    [reload],
  )

  const saveExercises = useCallback(
    async (routineId: string, exercises: readonly DraftExercise[]) => {
      const { error } = await supabase.rpc('set_routine_exercises', {
        routine: routineId,
        items: exercises.map((entry) => ({
          exercise_id: entry.exerciseId,
          set_reps: entry.setReps,
        })),
      })
      if (error) return false
      reload()
      return true
    },
    [reload],
  )

  const updateExercise = useCallback(
    async (id: string, setReps: number[]) => {
      const { data, error } = await supabase
        .from('routine_exercises')
        .update({ set_reps: setReps })
        .eq('id', id)
        .select('id')
        .single()
      if (!data || error) return false
      reload()
      return true
    },
    [reload],
  )

  const removeExercise = useCallback(
    async (id: string) => {
      const { data, error } = await supabase
        .from('routine_exercises')
        .delete()
        .eq('id', id)
        .select('id')
        .single()
      if (!data || error) return false
      reload()
      return true
    },
    [reload],
  )

  const status: RoutinesState['status'] = failed ? 'error' : loaded ? 'ready' : 'loading'

  return {
    routines,
    status,
    create,
    rename,
    remove,
    restore,
    setWeekdays,
    saveExercises,
    updateExercise,
    removeExercise,
  }
}

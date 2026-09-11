import { useCallback, useEffect, useState } from 'react'

import { useSession } from '@/features/auth/useSession'
import { supabase } from '@/lib/supabase'
import type { Intent, Override, PlannedRoutine } from '@/lib/schedule'
import { scheduledOn } from '@/lib/schedule'

/**
 * What is on each day of a stretch of time, and what has been done about it.
 *
 * Two reads: the exceptions to the weekly pattern in range, and the workouts in
 * range. The pattern itself comes from the caller, which already has the
 * routines loaded for its own list, one query, not two of the same. Everything
 * the week screen shows is derived from those three; nothing about a day's
 * status is stored.
 */
export interface DaySession {
  routine: PlannedRoutine
  /** The workout started from this routine on this day, if there is one. */
  workoutId: string | null
  loggedSets: number
  totalSets: number
}

export interface ScheduleDay {
  date: string
  sessions: DaySession[]
}

export interface ScheduleState {
  days: ScheduleDay[]
  overrides: Override[]
  status: 'loading' | 'ready' | 'error'
  /** Apply the writes a `lib/schedule` operation asked for. */
  apply: (intents: Intent[]) => Promise<boolean>
  reload: () => void
}

type WorkoutRow = {
  id: string
  date: string
  routine_id: string | null
  workout_sets: { done: boolean }[]
}

export function useSchedule(
  from: string,
  to: string,
  routines: readonly PlannedRoutine[],
): ScheduleState {
  const { session } = useSession()
  const userId = session?.user.id

  const [overrides, setOverrides] = useState<Override[]>([])
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([])
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [reloads, setReloads] = useState(0)
  const reload = useCallback(() => setReloads((n) => n + 1), [])

  useEffect(() => {
    if (!userId) return
    let active = true

    void Promise.all([
      supabase
        .from('scheduled_sessions')
        .select('routine_id, scheduled_date, status')
        .gte('scheduled_date', from)
        .lte('scheduled_date', to),
      supabase
        .from('workouts')
        .select('id, date, routine_id, workout_sets (done)')
        .gte('date', from)
        .lte('date', to),
    ]).then(([overrideRows, workoutRows]) => {
      if (!active) return
      if (overrideRows.error || workoutRows.error) {
        setFailed(true)
        setLoaded(true)
        return
      }

      setOverrides(
        (overrideRows.data ?? []).map((row) => ({
          routineId: row.routine_id,
          date: row.scheduled_date,
          status: row.status as Override['status'],
        })),
      )
      setWorkouts(workoutRows.data as unknown as WorkoutRow[])
      setFailed(false)
      setLoaded(true)
    })

    return () => {
      active = false
    }
  }, [userId, from, to, reloads])

  const apply = useCallback(
    async (intents: Intent[]) => {
      if (!userId || intents.length === 0) return false

      for (const intent of intents) {
        const result =
          intent.op === 'insert'
            ? await supabase.from('scheduled_sessions').insert({
                user_id: userId,
                routine_id: intent.routineId,
                scheduled_date: intent.date,
                status: intent.status,
              })
            : await supabase
                .from('scheduled_sessions')
                .delete()
                .eq('user_id', userId)
                .eq('routine_id', intent.routineId)
                .eq('scheduled_date', intent.date)

        if (result.error) return false
      }

      reload()
      return true
    },
    [userId, reload],
  )

  // Every day in range, with what is on it and what has been done about it.
  const days: ScheduleDay[] = []
  for (let date = from; date <= to; date = addDay(date)) {
    days.push({
      date,
      sessions: scheduledOn(routines, overrides, date).map((routine) => {
        const workout = workouts.find((row) => row.date === date && row.routine_id === routine.id)
        return {
          routine,
          workoutId: workout?.id ?? null,
          loggedSets: workout?.workout_sets.filter((set) => set.done).length ?? 0,
          totalSets: workout?.workout_sets.length ?? 0,
        }
      }),
    })
  }

  const status: ScheduleState['status'] = failed ? 'error' : loaded ? 'ready' : 'loading'
  return { days, overrides, status, apply, reload }
}

/** Local helper so the loop above reads as a date range rather than as maths. */
function addDay(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const next = new Date(year, month - 1, day + 1)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
}

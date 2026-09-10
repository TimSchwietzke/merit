import { useCallback, useMemo, useState, type ReactNode } from 'react'

import { useWorkout } from '@/features/training/useWorkout'
import { todayKey } from '@/lib/date'
import { ActiveSessionContext, type ActiveSessionState } from '@/features/training/useActiveSession'
import { activeSet, nextActive } from '@/lib/training'

/**
 * The session that is under way, held for the whole app.
 *
 * It lives above the router because the bar it drives has to survive walking
 * off to the food tab mid-workout — which is the reason it is a bar rather than
 * a dialog. Every reader of today's sets shares one version inside `useWorkout`,
 * so a write from anywhere — this bar, the day screen, starting a routine from
 * the preview — reaches all of them at once.
 */
export function ActiveSessionProvider({ children }: { children: ReactNode }) {
  const today = todayKey()
  const [chosen, setChosen] = useState<string | null>(null)
  const [ended, setEnded] = useState(false)

  const { sets, exercises, updateSet } = useWorkout(today)
  const active = activeSet(sets, chosen)

  const log = useCallback(
    async (values: { reps: number; weightKg: number; rir: number | null }) => {
      if (!active) return false
      const ok = await updateSet(active.id, { ...values, done: true })
      if (!ok) return false

      // Where to go next is decided from what the list looked like with this
      // set already logged, so the answer does not depend on the refetch
      // landing first.
      const after = sets.map((set) => (set.id === active.id ? { ...set, done: true } : set))
      setChosen(nextActive(after, { ...active, done: true }))
      return true
    },
    [active, sets, updateSet],
  )

  const value = useMemo<ActiveSessionState>(
    () => ({
      sets,
      exercises,
      active,
      // A session is running while today has a set nobody has logged yet.
      running: !ended && sets.some((set) => !set.done),
      ended,
      choose: (setId: string) => {
        setChosen(setId)
        setEnded(false)
      },
      log,
      end: () => setEnded(true),
    }),
    [sets, exercises, active, ended, log],
  )

  return <ActiveSessionContext.Provider value={value}>{children}</ActiveSessionContext.Provider>
}

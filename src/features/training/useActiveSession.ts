import { createContext, useContext } from 'react'

import type { ExerciseRef } from '@/features/training/useWorkout'
import type { LoggedSet } from '@/lib/training'

export interface ActiveSessionState {
  sets: LoggedSet[]
  exercises: Map<string, ExerciseRef>
  active: LoggedSet | null
  /** Bumped by every write, so anything reading today's sets refetches. */
  revision: number
  running: boolean
  ended: boolean
  choose: (setId: string) => void
  log: (values: { reps: number; weightKg: number; rir: number | null }) => Promise<boolean>
  end: () => void
}

export const ActiveSessionContext = createContext<ActiveSessionState | null>(null)

export function useActiveSession(): ActiveSessionState {
  const state = useContext(ActiveSessionContext)
  if (!state) throw new Error('useActiveSession must be used inside <ActiveSessionProvider>.')
  return state
}

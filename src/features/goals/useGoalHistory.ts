import { useEffect, useState } from 'react'

import { useSession } from '@/features/auth/useSession'
import { supabase } from '@/lib/supabase'
import type { Goal, GoalMode } from '@/lib/goals'

/**
 * Just the target history, for screens that measure a day against it.
 *
 * Separate from `useGoals`, which also loads the body figures and the last
 * weigh-in the targets screen needs, the day view has no use for either and
 * should not pay for two more round trips to render a bar.
 */
export function useGoalHistory(): { goals: Goal[]; status: 'loading' | 'ready' | 'error' } {
  const { session } = useSession()
  const userId = session?.user.id

  const [goals, setGoals] = useState<Goal[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    if (!userId) return
    let active = true

    void supabase
      .from('nutrition_goals')
      .select('mode, valid_from, kcal, protein_g, fat_g, carbs_g')
      .order('valid_from')
      .then(({ data, error }) => {
        if (!active) return
        if (error || !data) {
          setStatus('error')
          return
        }
        setGoals(
          data.map((row) => ({
            mode: row.mode as GoalMode,
            validFrom: row.valid_from,
            kcal: row.kcal,
            proteinG: row.protein_g,
            fatG: row.fat_g,
            carbsG: row.carbs_g,
          })),
        )
        setStatus('ready')
      })

    return () => {
      active = false
    }
  }, [userId])

  return { goals, status }
}

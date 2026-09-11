import { useCallback, useEffect, useState } from 'react'

import { useSession } from '@/features/auth/useSession'
import { supabase } from '@/lib/supabase'
import { todayKey } from '@/lib/date'
import type { ActivityLevel, Direction, Goal, GoalMode, Sex, Targets } from '@/lib/goals'

/**
 * Everything the targets screen reads and writes: the target history, the body
 * figures the calculation needs, and the latest weigh-in.
 *
 * Weight is not asked for again, it is already logged, and a second copy would
 * be one the user has to remember to keep in step (GOAL.md §7 keeps a fact in
 * one place).
 */
export interface BodyProfile {
  heightCm: number | null
  birthDate: string | null
  sex: Sex | null
  activityLevel: ActivityLevel | null
  direction: Direction | null
}

export interface GoalsState {
  goals: Goal[]
  body: BodyProfile
  /** From the most recent weigh-in, or null if none has been logged. */
  weightKg: number | null
  status: 'loading' | 'ready' | 'error'
  saveBody: (body: BodyProfile) => Promise<boolean>
  saveTargets: (mode: GoalMode, targets: Targets) => Promise<boolean>
}

const EMPTY: BodyProfile = {
  heightCm: null,
  birthDate: null,
  sex: null,
  activityLevel: null,
  direction: null,
}

export function useGoals(): GoalsState {
  const { session } = useSession()
  const userId = session?.user.id

  const [goals, setGoals] = useState<Goal[]>([])
  const [body, setBody] = useState<BodyProfile>(EMPTY)
  const [weightKg, setWeightKg] = useState<number | null>(null)
  const [status, setStatus] = useState<GoalsState['status']>('loading')

  useEffect(() => {
    if (!userId) return
    let active = true

    void Promise.all([
      supabase
        .from('nutrition_goals')
        .select('mode, valid_from, kcal, protein_g, fat_g, carbs_g')
        .order('valid_from'),
      supabase
        .from('profiles')
        .select('height_cm, birth_date, sex, activity_level, goal')
        .eq('user_id', userId)
        .single(),
      // One row, the newest. The whole log is not needed to know today's weight.
      supabase.from('weight_logs').select('weight_kg').order('date', { ascending: false }).limit(1),
    ]).then(([goalRows, profile, weight]) => {
      if (!active) return
      if (goalRows.error || profile.error || weight.error) {
        setStatus('error')
        return
      }

      setGoals(
        (goalRows.data ?? []).map((row) => ({
          mode: row.mode as GoalMode,
          validFrom: row.valid_from,
          kcal: row.kcal,
          proteinG: row.protein_g,
          fatG: row.fat_g,
          carbsG: row.carbs_g,
        })),
      )
      setBody({
        heightCm: profile.data?.height_cm ?? null,
        birthDate: profile.data?.birth_date ?? null,
        sex: (profile.data?.sex as Sex | null) ?? null,
        activityLevel: (profile.data?.activity_level as ActivityLevel | null) ?? null,
        direction: (profile.data?.goal as Direction | null) ?? null,
      })
      setWeightKg(weight.data?.[0]?.weight_kg ?? null)
      setStatus('ready')
    })

    return () => {
      active = false
    }
  }, [userId])

  const saveBody = useCallback(
    async (next: BodyProfile) => {
      if (!userId) return false
      const { data, error } = await supabase
        .from('profiles')
        .update({
          height_cm: next.heightCm,
          birth_date: next.birthDate,
          sex: next.sex,
          activity_level: next.activityLevel,
          goal: next.direction,
        })
        .eq('user_id', userId)
        .select('user_id')
        .single()

      if (!data || error) return false
      setBody(next)
      return true
    },
    [userId],
  )

  const saveTargets = useCallback(
    async (mode: GoalMode, targets: Targets) => {
      if (!userId) return false
      const validFrom = todayKey()

      // Upserted on (user_id, valid_from): changing a target twice in one day
      // corrects today rather than leaving two rows for it. Yesterday's target
      // is untouched, which is the point of keeping a history at all.
      const { data, error } = await supabase
        .from('nutrition_goals')
        .upsert({
          user_id: userId,
          valid_from: validFrom,
          mode,
          kcal: Math.round(targets.kcal),
          protein_g: Math.round(targets.proteinG),
          fat_g: Math.round(targets.fatG),
          carbs_g: Math.round(targets.carbsG),
        })
        .select('valid_from')
        .single()

      if (!data || error) return false

      const saved: Goal = {
        mode,
        validFrom,
        kcal: Math.round(targets.kcal),
        proteinG: Math.round(targets.proteinG),
        fatG: Math.round(targets.fatG),
        carbsG: Math.round(targets.carbsG),
      }
      setGoals((current) => [...current.filter((g) => g.validFrom !== validFrom), saved])
      return true
    },
    [userId],
  )

  return { goals, body, weightKg, status, saveBody, saveTargets }
}

import { useCallback, useEffect, useState } from 'react'

import { useSession } from '@/features/auth/useSession'
import { todayKey } from '@/lib/date'
import type { ActivityLevel, Direction, Sex, Targets } from '@/lib/goals'
import type { Answers } from '@/lib/onboarding'
import { supabase } from '@/lib/supabase'

/**
 * What the first-run walkthrough reads and writes.
 *
 * It owns no data of its own. Every answer is written to the table it belongs
 * to, in the same shape the screen for that table would write it, so a figure
 * entered here and the same figure edited later on the targets screen are one
 * row rather than two copies that drift (GOAL.md §7). The only thing it adds is
 * `profiles.onboarded_at`, which records that the question has been asked.
 *
 * Each step writes as it is left, which is what makes quitting halfway
 * resumable: what was entered is already saved, and `resumeAt` finds the first
 * thing that is not.
 */

/** The profile columns the walkthrough sets, in the app's own vocabulary. */
export interface ProfilePatch {
  displayName?: string | null
  heightCm?: number | null
  birthDate?: string | null
  sex?: Sex | null
  activityLevel?: ActivityLevel | null
  direction?: Direction | null
}

export interface OnboardingState {
  status: 'loading' | 'ready' | 'error'
  answers: Answers
  /** Whether the walkthrough has already been finished or dismissed once. */
  onboarded: boolean
  saveProfile: (patch: ProfilePatch) => Promise<boolean>
  saveWeight: (weightKg: number) => Promise<boolean>
  saveTarget: (targets: Targets) => Promise<boolean>
  /** Stop asking: the walkthrough was finished, or left on purpose. */
  finish: () => Promise<boolean>
}

const EMPTY: Answers = {
  displayName: null,
  weightKg: null,
  heightCm: null,
  birthDate: null,
  sex: null,
  activityLevel: null,
  direction: null,
  hasTarget: false,
}

/**
 * Whether this account still has the walkthrough ahead of it.
 *
 * One column, for the gate that stands in front of every screen. The full read
 * below is three queries, which is not what a redirect decision should cost on
 * every cold start.
 */
export function useOnboarded(): { status: 'loading' | 'ready' | 'error'; onboarded: boolean } {
  const { session } = useSession()
  const userId = session?.user.id
  const [state, setState] = useState<{
    status: 'loading' | 'ready' | 'error'
    onboarded: boolean
  }>({ status: 'loading', onboarded: false })

  useEffect(() => {
    if (!userId) return
    let active = true

    void supabase
      .from('profiles')
      .select('onboarded_at')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return
        if (error) return setState({ status: 'error', onboarded: false })
        setState({ status: 'ready', onboarded: data?.onboarded_at != null })
      })

    return () => {
      active = false
    }
  }, [userId])

  return state
}

export function useOnboarding(): OnboardingState {
  const { session } = useSession()
  const userId = session?.user.id

  const [answers, setAnswers] = useState<Answers>(EMPTY)
  const [onboarded, setOnboarded] = useState(false)
  const [status, setStatus] = useState<OnboardingState['status']>('loading')

  useEffect(() => {
    if (!userId) return
    let active = true

    void Promise.all([
      supabase
        .from('profiles')
        .select('display_name, height_cm, birth_date, sex, activity_level, goal, onboarded_at')
        .eq('user_id', userId)
        .single(),
      // The newest weigh-in, not the log: all the walkthrough needs to know is
      // whether there is one, and one row answers that.
      supabase.from('weight_logs').select('weight_kg').order('date', { ascending: false }).limit(1),
      supabase.from('nutrition_goals').select('valid_from').limit(1),
    ]).then(([profile, weight, goals]) => {
      if (!active) return
      if (profile.error || weight.error || goals.error) {
        setStatus('error')
        return
      }

      setAnswers({
        displayName: profile.data?.display_name ?? null,
        weightKg: weight.data?.[0]?.weight_kg ?? null,
        heightCm: profile.data?.height_cm ?? null,
        birthDate: profile.data?.birth_date ?? null,
        sex: (profile.data?.sex as Sex | null) ?? null,
        activityLevel: (profile.data?.activity_level as ActivityLevel | null) ?? null,
        direction: (profile.data?.goal as Direction | null) ?? null,
        hasTarget: (goals.data?.length ?? 0) > 0,
      })
      setOnboarded(profile.data?.onboarded_at != null)
      setStatus('ready')
    })

    return () => {
      active = false
    }
  }, [userId])

  // Every write ends in `.select()` and checks for a row. An update RLS refuses
  // matches nothing and still reports success, so without asking for the row
  // back a denied write looks exactly like a saved one.
  const saveProfile = useCallback(
    async (patch: ProfilePatch) => {
      if (!userId) return false
      const columns = {
        ...('displayName' in patch ? { display_name: patch.displayName } : {}),
        ...('heightCm' in patch ? { height_cm: patch.heightCm } : {}),
        ...('birthDate' in patch ? { birth_date: patch.birthDate } : {}),
        ...('sex' in patch ? { sex: patch.sex } : {}),
        ...('activityLevel' in patch ? { activity_level: patch.activityLevel } : {}),
        ...('direction' in patch ? { goal: patch.direction } : {}),
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(columns)
        .eq('user_id', userId)
        .select('user_id')
      if (error || data.length === 0) return false

      setAnswers((current) => ({ ...current, ...patch }))
      return true
    },
    [userId],
  )

  const saveWeight = useCallback(
    async (weightKg: number) => {
      if (!userId) return false
      // Upsert on (user_id, date), the same as the weight screen: a weight
      // entered here and a weigh-in later the same day is one correction, not
      // two rows.
      const { data, error } = await supabase
        .from('weight_logs')
        .upsert({ user_id: userId, date: todayKey(), weight_kg: weightKg })
        .select('date')
        .single()
      if (error || !data) return false

      setAnswers((current) => ({ ...current, weightKg }))
      return true
    },
    [userId],
  )

  const saveTarget = useCallback(
    async (targets: Targets) => {
      if (!userId) return false
      const { data, error } = await supabase
        .from('nutrition_goals')
        .upsert({
          user_id: userId,
          valid_from: todayKey(),
          mode: 'calculated',
          kcal: Math.round(targets.kcal),
          protein_g: Math.round(targets.proteinG),
          fat_g: Math.round(targets.fatG),
          carbs_g: Math.round(targets.carbsG),
        })
        .select('valid_from')
        .single()
      if (error || !data) return false

      setAnswers((current) => ({ ...current, hasTarget: true }))
      return true
    },
    [userId],
  )

  const finish = useCallback(async () => {
    if (!userId) return false
    const { data, error } = await supabase
      .from('profiles')
      .update({ onboarded_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select('user_id')
    if (error || data.length === 0) return false

    setOnboarded(true)
    return true
  }, [userId])

  return { status, answers, onboarded, saveProfile, saveWeight, saveTarget, finish }
}

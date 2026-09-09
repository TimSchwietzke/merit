import { useEffect, useState } from 'react'

import { supabase } from '@/lib/supabase'
import type { ExerciseRef } from '@/features/training/useWorkout'

/**
 * One exercise by id.
 *
 * The day's own query only knows the exercises that appear in it, so an
 * exercise just picked — which by definition has no sets yet — has to be
 * fetched to be named. It is a single row on the way into logging a set.
 */
export function useExercise(id: string | null): ExerciseRef | null {
  // The id the row belongs to is held with it, so "no exercise asked for" and
  // "asked for a different one" are read during render rather than written
  // into state at the top of the effect.
  const [fetched, setFetched] = useState<ExerciseRef | null>(null)

  useEffect(() => {
    if (!id) return
    let active = true

    void supabase
      .from('exercises')
      .select('id, name_en, name_de, muscle_group, equipment')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active || !data) return
        setFetched({
          id: data.id,
          nameEn: data.name_en,
          nameDe: data.name_de,
          muscleGroup: data.muscle_group,
          equipment: data.equipment,
        })
      })

    return () => {
      active = false
    }
  }, [id])

  return fetched && fetched.id === id ? fetched : null
}

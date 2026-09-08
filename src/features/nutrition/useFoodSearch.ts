import { useEffect, useState } from 'react'

import { supabase } from '@/lib/supabase'
import type { FoodNutrients } from '@/lib/nutrition'

/**
 * Search the shared catalogue by name.
 *
 * Own database first (GOAL.md §4). Open Food Facts and the USDA proxy are the
 * next two steps in that lookup order and are not built yet; the empty state
 * here already offers the fourth, which is adding the food by hand.
 */
export interface CatalogueFood {
  id: string
  name: string
  brand: string | null
  source: string
  servingSizeG: number | null
  servingLabel: string | null
  nutrients: FoodNutrients
}

const SELECT = `id, name, brand, source, serving_size_g, serving_label,
  kcal_100g, fat_100g, carbs_100g, protein_100g,
  saturated_fat_100g, sugars_100g, fibre_100g, salt_100g`

/** Below this a search matches most of the catalogue and helps nobody. */
const MIN_QUERY = 2
const LIMIT = 25

export function useFoodSearch(query: string) {
  // The query the results belong to is held with them, so "too short" and
  // "still searching" are read off the current query during render rather than
  // written into state at the top of an effect.
  const [answered, setAnswered] = useState<{ query: string; results: CatalogueFood[]; error: boolean }>(
    { query: '', results: [], error: false },
  )

  const trimmed = query.trim()
  const tooShort = trimmed.length < MIN_QUERY

  useEffect(() => {
    if (tooShort) return
    let active = true

    // Typing is faster than a round trip on a phone connection, so the query
    // waits for a pause rather than firing per keystroke.
    const timer = setTimeout(() => {
      void supabase
        .from('foods')
        .select(SELECT)
        .ilike('name', `%${trimmed}%`)
        .order('name')
        .limit(LIMIT)
        .then(({ data, error }) => {
          if (!active) return
          if (error || !data) {
            setAnswered({ query: trimmed, results: [], error: true })
            return
          }
          setAnswered({
            query: trimmed,
            error: false,
            results: data.map((row) => ({
              id: row.id,
              name: row.name,
              brand: row.brand,
              source: row.source,
              servingSizeG: row.serving_size_g,
              servingLabel: row.serving_label,
              nutrients: {
                kcal: row.kcal_100g,
                fat: row.fat_100g,
                carbs: row.carbs_100g,
                protein: row.protein_100g,
                saturatedFat: row.saturated_fat_100g,
                sugars: row.sugars_100g,
                fibre: row.fibre_100g,
                salt: row.salt_100g,
              },
            })),
          })
        })
    }, 250)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [trimmed, tooShort])

  const answersThis = answered.query === trimmed
  const status: 'idle' | 'searching' | 'ready' | 'error' = tooShort
    ? 'idle'
    : !answersThis
      ? 'searching'
      : answered.error
        ? 'error'
        : 'ready'

  return { results: status === 'ready' ? answered.results : [], status }
}

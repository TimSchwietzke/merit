import { useEffect, useState } from 'react'

import { useSession } from '@/features/auth/useSession'
import { supabase } from '@/lib/supabase'
import type { CatalogueFood } from '@/features/nutrition/useFoodSearch'

/**
 * The foods this user logged most recently, each once.
 *
 * §10.11 puts recently-used above everything on a screen whose job is picking,
 * because the answer is usually something picked before. GOAL.md §5 goes
 * further and calls repeating a previous meal the feature that decides whether
 * the app gets used daily.
 *
 * Deduplication happens here rather than in SQL: PostgREST has no `distinct on`,
 * and a hundred recent rows is a smaller thing to fetch than a view is to
 * maintain.
 */
const SELECT = `food_id, quantity_g, meal_type,
  foods!inner (
    id, name, brand, source, serving_size_g, serving_label,
    kcal_100g, fat_100g, carbs_100g, protein_100g,
    saturated_fat_100g, sugars_100g, fibre_100g, salt_100g
  )`

const SCAN = 100

export interface RecentFood {
  food: CatalogueFood
  /** What was logged last time, so re-logging it needs no typing. */
  quantityG: number
  mealType: string
}

type Row = {
  food_id: string
  quantity_g: number
  meal_type: string
  foods: {
    id: string
    name: string
    brand: string | null
    source: string
    serving_size_g: number | null
    serving_label: string | null
    kcal_100g: number
    fat_100g: number
    carbs_100g: number
    protein_100g: number
    saturated_fat_100g: number | null
    sugars_100g: number | null
    fibre_100g: number | null
    salt_100g: number | null
  }
}

export function useRecentFoods(limit = 8): RecentFood[] {
  const { session } = useSession()
  const userId = session?.user.id
  const [recent, setRecent] = useState<RecentFood[]>([])

  useEffect(() => {
    if (!userId) return
    let active = true

    void supabase
      .from('food_logs')
      .select(SELECT)
      .order('created_at', { ascending: false })
      .limit(SCAN)
      .then(({ data, error }) => {
        if (!active || error || !data) return

        const seen = new Set<string>()
        const out: RecentFood[] = []
        for (const row of data as unknown as Row[]) {
          if (seen.has(row.food_id)) continue
          seen.add(row.food_id)
          out.push({
            quantityG: row.quantity_g,
            mealType: row.meal_type,
            food: {
              id: row.foods.id,
              name: row.foods.name,
              brand: row.foods.brand,
              source: row.foods.source,
              servingSizeG: row.foods.serving_size_g,
              servingLabel: row.foods.serving_label,
              nutrients: {
                kcal: row.foods.kcal_100g,
                fat: row.foods.fat_100g,
                carbs: row.foods.carbs_100g,
                protein: row.foods.protein_100g,
                saturatedFat: row.foods.saturated_fat_100g,
                sugars: row.foods.sugars_100g,
                fibre: row.foods.fibre_100g,
                salt: row.foods.salt_100g,
              },
            },
          })
          if (out.length === limit) break
        }
        setRecent(out)
      })

    return () => {
      active = false
    }
  }, [userId, limit])

  return recent
}

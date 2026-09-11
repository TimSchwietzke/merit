import { useEffect, useState } from 'react'

import { useSession } from '@/features/auth/useSession'
import { supabase } from '@/lib/supabase'
import {
  FOOD_SELECT,
  toCatalogueFood,
  type CatalogueFood,
  type FoodRow,
} from '@/features/nutrition/catalogue'

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
  foods!inner ( ${FOOD_SELECT} )`

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
  foods: FoodRow
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
            food: toCatalogueFood(row.foods),
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

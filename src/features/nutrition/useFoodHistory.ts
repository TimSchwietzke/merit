import { useEffect, useState } from 'react'

import { useSession } from '@/features/auth/useSession'
import { addDays } from '@/lib/date'
import type { DayTotal } from '@/lib/nutrition-progress'
import { supabase } from '@/lib/supabase'

/**
 * What was eaten on each day of a trailing window, as one number per day.
 *
 * Calories only, and no macros: the three things reading this, the
 * consistency mark, the running average and the days-on-target count, all ask
 * about energy, and pulling every nutrient of every portion for a month to
 * answer them would be the most expensive query in the app for the least
 * information in it.
 *
 * A day is present here only if something was logged on it. Absent is not zero
 *, nobody ate nothing, and the maths downstream depends on being able to tell
 * an unlogged day from an empty one.
 */
export interface FoodHistory {
  /** Days with anything logged, for the consistency mark. */
  days: Set<string>
  /** One entry per logged day, oldest first. */
  totals: DayTotal[]
}

type Row = { date: string; quantity_g: number; foods: { kcal_100g: number | null } }

export function useFoodHistory(today: string, days = 90): FoodHistory {
  const { session } = useSession()
  const userId = session?.user.id
  const [history, setHistory] = useState<FoodHistory>({ days: new Set(), totals: [] })

  useEffect(() => {
    if (!userId) return
    let active = true

    void supabase
      .from('food_logs')
      .select('date, quantity_g, foods!inner (kcal_100g)')
      .gte('date', addDays(today, -days))
      .lte('date', today)
      .then(({ data, error }) => {
        if (!active || error || !data) return

        const byDay = new Map<string, number>()
        for (const row of data as unknown as Row[]) {
          const kcal = row.foods.kcal_100g
          // A food with no energy value contributes nothing and still marks the
          // day as logged. The day happened even if this portion cannot be
          // counted.
          const add = kcal === null ? 0 : (kcal * row.quantity_g) / 100
          byDay.set(row.date, (byDay.get(row.date) ?? 0) + add)
        }

        setHistory({
          days: new Set(byDay.keys()),
          totals: [...byDay.entries()]
            .map(([date, kcal]) => ({ date, kcal }))
            .sort((a, b) => a.date.localeCompare(b.date)),
        })
      })

    return () => {
      active = false
    }
  }, [userId, today, days])

  return history
}

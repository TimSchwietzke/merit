import { useCallback, useEffect, useRef, useState } from 'react'

import { useSession } from '@/features/auth/useSession'
import { supabase } from '@/lib/supabase'
import type { FoodNutrients, MealType } from '@/lib/nutrition'

/**
 * One day's logged portions, joined to the catalogue.
 *
 * The nutrition values are embedded from `foods` rather than copied into the
 * log row (GOAL.md §7): a product whose values get corrected has to correct
 * every meal already logged from it, and a copy cannot.
 *
 * Writes are optimistic and roll back from a ref, for the same reason the
 * weight log does — see `useWeightLogs`.
 */
export interface LoggedFood {
  id: string
  mealType: MealType
  quantityG: number
  food: { id: string; name: string; brand: string | null; nutrients: FoodNutrients }
}

export interface FoodLog {
  entries: LoggedFood[]
  status: 'loading' | 'ready' | 'error'
  add: (entry: { foodId: string; mealType: MealType; quantityG: number }) => Promise<boolean>
  remove: (id: string) => Promise<boolean>
  restore: (entry: LoggedFood) => Promise<boolean>
}

/** The columns a portion needs, and the shape the maths expects. */
const SELECT = `id, meal_type, quantity_g,
  foods!inner (
    id, name, brand,
    kcal_100g, fat_100g, carbs_100g, protein_100g,
    saturated_fat_100g, sugars_100g, fibre_100g, salt_100g
  )`

type Row = {
  id: string
  meal_type: string
  quantity_g: number
  foods: {
    id: string
    name: string
    brand: string | null
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

const toEntry = (row: Row): LoggedFood => ({
  id: row.id,
  mealType: row.meal_type as MealType,
  quantityG: row.quantity_g,
  food: {
    id: row.foods.id,
    name: row.foods.name,
    brand: row.foods.brand,
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

export function useFoodLog(date: string): FoodLog {
  const { session } = useSession()
  const userId = session?.user.id

  // The day the rows belong to is held with them, so `status` is derived from
  // whether they are this day's rather than set at the top of the effect. It
  // also means a day change cannot show the previous day's foods for a frame.
  const [loaded, setLoaded] = useState<{ date: string; entries: LoggedFood[]; error: boolean }>({
    date: '',
    entries: [],
    error: false,
  })

  const loadedRef = useRef(loaded)
  const apply = useCallback((next: (current: LoggedFood[]) => LoggedFood[], forDate: string) => {
    loadedRef.current = { date: forDate, entries: next(loadedRef.current.entries), error: false }
    setLoaded(loadedRef.current)
  }, [])

  useEffect(() => {
    if (!userId) return
    let active = true

    void supabase
      .from('food_logs')
      .select(SELECT)
      .eq('date', date)
      .order('created_at')
      .then(({ data, error }) => {
        if (!active) return
        if (error || !data) {
          setLoaded({ date, entries: [], error: true })
          return
        }
        loadedRef.current = { date, entries: (data as unknown as Row[]).map(toEntry), error: false }
        setLoaded(loadedRef.current)
      })

    return () => {
      active = false
    }
  }, [userId, date])

  const isCurrent = loaded.date === date
  const entries = isCurrent ? loaded.entries : []
  const status: FoodLog['status'] = !isCurrent ? 'loading' : loaded.error ? 'error' : 'ready'

  const add = useCallback(
    async ({ foodId, mealType, quantityG }: { foodId: string; mealType: MealType; quantityG: number }) => {
      if (!userId) return false

      // Not optimistic: the row comes back with the food embedded, and
      // inventing that locally means holding a second copy of the catalogue
      // values this hook exists to avoid copying.
      const { data, error } = await supabase
        .from('food_logs')
        .insert({ user_id: userId, date, meal_type: mealType, food_id: foodId, quantity_g: quantityG })
        .select(SELECT)
        .single()

      if (!data || error) return false
      apply((current) => [...current, toEntry(data as unknown as Row)], date)
      return true
    },
    [apply, date, userId],
  )

  const remove = useCallback(
    async (id: string) => {
      if (!userId) return false
      const previous = loadedRef.current.entries
      apply((current) => current.filter((entry) => entry.id !== id), date)

      const { data, error } = await supabase
        .from('food_logs')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
        .select('id')
        .single()

      if (data && !error) return true
      apply(() => previous, date)
      return false
    },
    [apply, date, userId],
  )

  // Undo re-inserts rather than un-deletes, so the row comes back with a new
  // id. Nothing references a log row, so nothing notices.
  const restore = useCallback(
    (entry: LoggedFood) =>
      add({ foodId: entry.food.id, mealType: entry.mealType, quantityG: entry.quantityG }),
    [add],
  )

  return { entries, status, add, remove, restore }
}

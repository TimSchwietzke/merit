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
 * weight log does, see `useWeightLogs`.
 */
export interface LoggedFood {
  id: string
  mealType: MealType
  quantityG: number
  food: { id: string; name: string; brand: string | null; nutrients: FoodNutrients }
  /** The logged recipe this row is an ingredient of, or null for a plain entry. */
  group: LoggedRecipe | null
}

export interface LoggedRecipe {
  id: string
  recipeId: string | null
  name: string
  factor: number
  grams: number | null
}

export interface FoodLog {
  entries: LoggedFood[]
  status: 'loading' | 'ready' | 'error'
  add: (entry: { foodId: string; mealType: MealType; quantityG: number; groupId?: string }) => Promise<boolean>
  /** Change a logged portion's quantity or the meal it belongs to. */
  update: (id: string, portion: { mealType: MealType; quantityG: number }) => Promise<boolean>
  remove: (id: string) => Promise<boolean>
  restore: (entry: LoggedFood) => Promise<boolean>
  /** A recipe, scaled, as one line of ingredient rows (`log_recipe`). */
  logRecipe: (recipeId: string, mealType: MealType, portion: { factor: number; grams: number | null }) => Promise<boolean>
  /** A logged recipe line and every row under it. */
  removeGroup: (groupId: string) => Promise<boolean>
  /** Undo for `removeGroup`: the line and its rows come back as they were. */
  restoreGroup: (rows: LoggedFood[]) => Promise<boolean>
}

/** The columns a portion needs, and the shape the maths expects. */
const SELECT = `id, meal_type, quantity_g,
  logged_recipes!food_logs_group_fkey ( id, recipe_id, name, factor, grams ),
  foods!inner (
    id, name, brand,
    kcal_100g, fat_100g, carbs_100g, protein_100g,
    saturated_fat_100g, sugars_100g, fibre_100g, salt_100g
  )`

type Row = {
  id: string
  meal_type: string
  quantity_g: number
  logged_recipes: { id: string; recipe_id: string | null; name: string; factor: number; grams: number | null } | null
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
  group: row.logged_recipes
    ? {
        id: row.logged_recipes.id,
        recipeId: row.logged_recipes.recipe_id,
        name: row.logged_recipes.name,
        factor: row.logged_recipes.factor,
        grams: row.logged_recipes.grams,
      }
    : null,
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

  // Bumped after a write whose rows the server makes (a logged recipe), so the
  // day is read again rather than rebuilt here.
  const [version, setVersion] = useState(0)
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
  }, [userId, date, version])

  const isCurrent = loaded.date === date
  const entries = isCurrent ? loaded.entries : []
  const status: FoodLog['status'] = !isCurrent ? 'loading' : loaded.error ? 'error' : 'ready'

  const add = useCallback(
    async ({
      foodId,
      mealType,
      quantityG,
      groupId,
    }: {
      foodId: string
      mealType: MealType
      quantityG: number
      groupId?: string
    }) => {
      if (!userId) return false

      // Not optimistic: the row comes back with the food embedded, and
      // inventing that locally means holding a second copy of the catalogue
      // values this hook exists to avoid copying.
      const { data, error } = await supabase
        .from('food_logs')
        .insert({
          user_id: userId,
          date,
          meal_type: mealType,
          food_id: foodId,
          quantity_g: quantityG,
          group_id: groupId ?? null,
        })
        .select(SELECT)
        .single()

      if (!data || error) return false
      apply((current) => [...current, toEntry(data as unknown as Row)], date)
      return true
    },
    [apply, date, userId],
  )

  const update = useCallback(
    async (id: string, portion: { mealType: MealType; quantityG: number }) => {
      if (!userId) return false
      const previous = loadedRef.current.entries

      apply(
        (current) =>
          current.map((entry) =>
            entry.id === id
              ? { ...entry, mealType: portion.mealType, quantityG: portion.quantityG }
              : entry,
          ),
        date,
      )

      const { data, error } = await supabase
        .from('food_logs')
        .update({ meal_type: portion.mealType, quantity_g: portion.quantityG })
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
      add({
        foodId: entry.food.id,
        mealType: entry.mealType,
        quantityG: entry.quantityG,
        groupId: entry.group?.id,
      }),
    [add],
  )

  const logRecipe = useCallback(
    async (recipeId: string, mealType: MealType, portion: { factor: number; grams: number | null }) => {
      if (!userId) return false
      const { error } = await supabase.rpc('log_recipe', {
        recipe: recipeId,
        day: date,
        meal: mealType,
        factor: portion.factor,
        grams: portion.grams ?? undefined,
      })
      if (error) return false
      setVersion((v) => v + 1)
      return true
    },
    [date, userId],
  )

  const removeGroup = useCallback(
    async (groupId: string) => {
      if (!userId) return false
      const previous = loadedRef.current.entries
      apply((current) => current.filter((entry) => entry.group?.id !== groupId), date)

      // The rows go with the line (on delete cascade).
      const { data, error } = await supabase
        .from('logged_recipes')
        .delete()
        .eq('id', groupId)
        .eq('user_id', userId)
        .select('id')
        .single()

      if (data && !error) return true
      apply(() => previous, date)
      return false
    },
    [apply, date, userId],
  )

  const restoreGroup = useCallback(
    async (rows: LoggedFood[]) => {
      const group = rows[0]?.group
      if (!userId || !group) return false
      const { data: line, error } = await supabase
        .from('logged_recipes')
        .insert({
          user_id: userId,
          date,
          meal_type: rows[0].mealType,
          recipe_id: group.recipeId,
          name: group.name,
          factor: group.factor,
          grams: group.grams,
        })
        .select('id')
        .single()
      if (!line || error) return false

      const { error: rowsError } = await supabase.from('food_logs').insert(
        rows.map((row) => ({
          user_id: userId,
          date,
          meal_type: row.mealType,
          food_id: row.food.id,
          quantity_g: row.quantityG,
          group_id: line.id,
        })),
      )
      setVersion((v) => v + 1)
      return !rowsError
    },
    [date, userId],
  )

  return { entries, status, add, update, remove, restore, logRecipe, removeGroup, restoreGroup }
}

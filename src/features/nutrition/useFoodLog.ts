import { useCallback, useEffect, useRef, useState } from 'react'

import { useSession } from '@/features/auth/useSession'
import { supabase } from '@/lib/supabase'
import type { FoodNutrients, MealType } from '@/lib/nutrition'
import { storedPortion, type RecipePortion } from '@/lib/recipe'

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
  /** For an ingredient: its amount in one whole recipe, unrounded. */
  recipeG: number | null
}

export interface LoggedRecipe {
  id: string
  recipeId: string | null
  name: string
  factor: number
  /** The portion as typed: parts, or the whole recipe times `factor`. */
  portion: RecipePortion
}

export interface FoodLog {
  entries: LoggedFood[]
  status: 'loading' | 'ready' | 'error'
  add: (entry: { foodId: string; mealType: MealType; quantityG: number; groupId?: string; recipeG?: number | null }) => Promise<boolean>
  /** Change a logged portion's quantity or the meal it belongs to. */
  update: (id: string, portion: { mealType: MealType; quantityG: number }) => Promise<boolean>
  remove: (id: string) => Promise<boolean>
  restore: (entry: LoggedFood) => Promise<boolean>
  /** A recipe, scaled, as one line of ingredient rows (`log_recipe`). */
  logRecipe: (recipeId: string, mealType: MealType, portion: RecipePortion) => Promise<boolean>
  /** A logged recipe line's portion and meal, every row under it with it. */
  updateGroup: (groupId: string, portion: RecipePortion, mealType: MealType) => Promise<boolean>
  /** A logged recipe line and every row under it. */
  removeGroup: (groupId: string) => Promise<boolean>
  /** Undo for `removeGroup`: the line and its rows come back as they were. */
  restoreGroup: (rows: LoggedFood[]) => Promise<boolean>
}

/** The columns a portion needs, and the shape the maths expects. */
const SELECT = `id, meal_type, quantity_g, recipe_g,
  logged_recipes!food_logs_group_fkey ( id, recipe_id, name, factor, parts_eaten, parts_total ),
  foods!inner (
    id, name, brand,
    kcal_100g, fat_100g, carbs_100g, protein_100g,
    saturated_fat_100g, sugars_100g, fibre_100g, salt_100g
  )`

type Row = {
  id: string
  meal_type: string
  quantity_g: number
  recipe_g: number | null
  logged_recipes: {
    id: string
    recipe_id: string | null
    name: string
    factor: number
    parts_eaten: number | null
    parts_total: number | null
  } | null
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
  recipeG: row.recipe_g,
  group: row.logged_recipes
    ? {
        id: row.logged_recipes.id,
        recipeId: row.logged_recipes.recipe_id,
        name: row.logged_recipes.name,
        factor: row.logged_recipes.factor,
        portion: storedPortion(row.logged_recipes.factor, row.logged_recipes.parts_eaten, row.logged_recipes.parts_total),
      }
    : null,
})

/** A portion as the two RPCs take it: the share, and the parts when given in parts. */
const rpcPortion = (portion: RecipePortion) =>
  portion.kind === 'part'
    ? { factor: portion.eaten / portion.of, eaten: portion.eaten, total: portion.of }
    : { factor: portion.times }

/**
 * Every mounted day, told when any of them has written. An undo can run after
 * its screen has gone (the toast outlives it), and the day it returns to has
 * its own copy of the rows.
 */
const mounted = new Set<() => void>()
/** Tell every mounted day but `except`, which already holds the change. */
const changed = (except?: () => void) =>
  mounted.forEach((reload) => {
    if (reload !== except) reload()
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

  // A reload that arrives while one of this day's own writes is in flight
  // waits for it: read now, it would bring back the row being removed, and a
  // failed write would then roll back over what the reload brought in.
  const pending = useRef(0)
  const stale = useRef(false)
  const [self] = useState(() => () => {
    if (pending.current > 0) stale.current = true
    else setVersion((v) => v + 1)
  })
  useEffect(() => {
    mounted.add(self)
    return () => {
      mounted.delete(self)
    }
  }, [self])
  const writing = useCallback(async <T,>(run: () => Promise<T>): Promise<T> => {
    pending.current += 1
    try {
      return await run()
    } finally {
      pending.current -= 1
      if (pending.current === 0 && stale.current) {
        stale.current = false
        setVersion((v) => v + 1)
      }
    }
  }, [])
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
      recipeG,
    }: {
      foodId: string
      mealType: MealType
      quantityG: number
      groupId?: string
      recipeG?: number | null
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
          recipe_g: recipeG ?? null,
        })
        .select(SELECT)
        .single()

      if (!data || error) return false
      apply((current) => [...current, toEntry(data as unknown as Row)], date)
      changed(self)
      return true
    },
    [apply, date, self, userId],
  )

  const update = useCallback(
    async (id: string, portion: { mealType: MealType; quantityG: number }) => {
      if (!userId) return false
      const previous = loadedRef.current.entries
      // A corrected ingredient keeps its correction through a later change of
      // the line's portion: its base becomes the new amount over the factor.
      const group = previous.find((entry) => entry.id === id)?.group

      apply(
        (current) =>
          current.map((entry) =>
            entry.id === id
              ? { ...entry, mealType: portion.mealType, quantityG: portion.quantityG }
              : entry,
          ),
        date,
      )

      const { data, error } = await writing(async () =>
        supabase
          .from('food_logs')
          .update({
            meal_type: portion.mealType,
            quantity_g: portion.quantityG,
            ...(group ? { recipe_g: portion.quantityG / group.factor } : {}),
          })
          .eq('id', id)
          .eq('user_id', userId)
          .select('id')
          .single(),
      )

      if (data && !error) {
        changed(self)
        return true
      }
      apply(() => previous, date)
      return false
    },
    [apply, date, self, userId, writing],
  )

  const remove = useCallback(
    async (id: string) => {
      if (!userId) return false
      const previous = loadedRef.current.entries
      apply((current) => current.filter((entry) => entry.id !== id), date)

      const { data, error } = await writing(async () =>
        supabase.from('food_logs').delete().eq('id', id).eq('user_id', userId).select('id').single(),
      )

      if (data && !error) {
        changed(self)
        return true
      }
      apply(() => previous, date)
      return false
    },
    [apply, date, self, userId, writing],
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
        recipeG: entry.recipeG,
      }),
    [add],
  )

  const logRecipe = useCallback(
    async (recipeId: string, mealType: MealType, portion: RecipePortion) => {
      if (!userId) return false
      const { error } = await supabase.rpc('log_recipe', { recipe: recipeId, day: date, meal: mealType, ...rpcPortion(portion) })
      if (error) return false
      changed()
      return true
    },
    [date, userId],
  )

  const updateGroup = useCallback(
    async (groupId: string, portion: RecipePortion, mealType: MealType) => {
      if (!userId) return false
      const { error } = await supabase.rpc('update_logged_recipe', { line: groupId, meal: mealType, ...rpcPortion(portion) })
      if (error) return false
      changed()
      return true
    },
    [userId],
  )

  const removeGroup = useCallback(
    async (groupId: string) => {
      if (!userId) return false
      const previous = loadedRef.current.entries
      apply((current) => current.filter((entry) => entry.group?.id !== groupId), date)

      // The rows go with the line (on delete cascade).
      const { data, error } = await writing(async () =>
        supabase.from('logged_recipes').delete().eq('id', groupId).eq('user_id', userId).select('id').single(),
      )

      if (data && !error) {
        changed(self)
        return true
      }
      apply(() => previous, date)
      return false
    },
    [apply, date, self, userId, writing],
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
          parts_eaten: group.portion.kind === 'part' ? group.portion.eaten : null,
          parts_total: group.portion.kind === 'part' ? group.portion.of : null,
        })
        .select('id')
        .single()
      if (!line || error) return false

      const { error: rowsError } = await supabase.from('food_logs').insert(
        // Apart in time, so they come back in the order they were listed.
        rows.map((row, index) => ({
          created_at: new Date(Date.now() + index).toISOString(),
          user_id: userId,
          date,
          meal_type: row.mealType,
          food_id: row.food.id,
          quantity_g: row.quantityG,
          recipe_g: row.recipeG,
          group_id: line.id,
        })),
      )
      changed()
      return !rowsError
    },
    [date, userId],
  )

  return { entries, status, add, update, remove, restore, logRecipe, updateGroup, removeGroup, restoreGroup }
}

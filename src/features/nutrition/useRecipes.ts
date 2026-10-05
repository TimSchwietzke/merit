import { useCallback, useEffect, useState } from 'react'

import { FOOD_SELECT, toCatalogueFood, type CatalogueFood, type FoodRow } from '@/features/nutrition/catalogue'
import { useSession } from '@/features/auth/useSession'
import { sumPortions, type DayTotals } from '@/lib/nutrition'
import { supabase } from '@/lib/supabase'

/**
 * The user's recipes, each with its ingredients joined to the catalogue.
 *
 * Writes go straight to the tables and the list is read again after each one:
 * a recipe is edited a few times and logged many, and a re-read is simpler
 * than keeping a local copy honest.
 */
export interface RecipeItem {
  id: string
  quantityG: number
  /** The order ingredients are listed in, kept through an undo. */
  createdAt: string
  food: CatalogueFood
}

export interface Recipe {
  id: string
  name: string
  items: RecipeItem[]
  /** The whole recipe's nutrition, from its ingredients. */
  totals: DayTotals
}

/** A recipe's energy and macros, whole, as the portion form scales them. */
export const wholeOf = (totals: DayTotals) => ({
  kcal: totals.kcal.value,
  protein: totals.protein.value,
  fat: totals.fat.value,
  carbs: totals.carbs.value,
})

type Row = {
  id: string
  name: string
  recipe_items: { id: string; quantity_g: number; created_at: string; foods: FoodRow }[]
}

const SELECT = `id, name, recipe_items ( id, quantity_g, created_at, foods!inner ( ${FOOD_SELECT} ) )`

const toRecipe = (row: Row): Recipe => {
  const items = [...row.recipe_items]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((item) => ({
      id: item.id,
      quantityG: item.quantity_g,
      createdAt: item.created_at,
      food: toCatalogueFood(item.foods),
    }))
  return {
    id: row.id,
    name: row.name,
    items,
    totals: sumPortions(items.map((item) => ({ nutrients: item.food.nutrients, quantityG: item.quantityG }))),
  }
}

/**
 * Every mounted list of recipes, told when any of them has written. The editor
 * saves its last edit as it unmounts, and the list it returns to has already
 * read by then; without this it would show the old name until a reload.
 */
const mounted = new Set<() => void>()
const changed = () => mounted.forEach((reload) => reload())

export function useRecipes() {
  const { session } = useSession()
  const userId = session?.user.id
  const [state, setState] = useState<{ recipes: Recipe[]; status: 'loading' | 'ready' | 'error' }>({
    recipes: [],
    status: 'loading',
  })
  const [version, setVersion] = useState(0)
  const reload = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    mounted.add(reload)
    return () => {
      mounted.delete(reload)
    }
  }, [reload])

  useEffect(() => {
    if (!userId) return
    let active = true
    void supabase
      .from('recipes')
      .select(SELECT)
      .order('name')
      .then(({ data, error }) => {
        if (!active) return
        setState(
          error || !data
            ? { recipes: [], status: 'error' }
            : { recipes: (data as unknown as Row[]).map(toRecipe), status: 'ready' },
        )
      })
    return () => {
      active = false
    }
  }, [userId, version])

  /** A write, then a re-read when it went through. */
  const write = useCallback(
    async (run: () => PromiseLike<{ error: unknown }>) => {
      const { error } = await run()
      if (!error) changed()
      return !error
    },
    [],
  )

  const create = useCallback(
    async (name: string) => {
      if (!userId) return null
      const { data, error } = await supabase
        .from('recipes')
        .insert({ user_id: userId, name: name.trim() })
        .select('id')
        .single()
      if (!data || error) return null
      changed()
      return data.id
    },
    [userId],
  )

  const update = useCallback(
    (id: string, name: string) =>
      write(() => supabase.from('recipes').update({ name: name.trim() }).eq('id', id)),
    [write],
  )

  const remove = useCallback(
    (id: string) => write(() => supabase.from('recipes').delete().eq('id', id)),
    [write],
  )

  const addItem = useCallback(
    (recipeId: string, foodId: string, quantityG: number, createdAt?: string) =>
      write(() =>
        supabase
          .from('recipe_items')
          .insert({ recipe_id: recipeId, food_id: foodId, quantity_g: quantityG, created_at: createdAt }),
      ),
    [write],
  )

  const updateItem = useCallback(
    (id: string, quantityG: number) =>
      write(() => supabase.from('recipe_items').update({ quantity_g: quantityG }).eq('id', id)),
    [write],
  )

  const removeItem = useCallback(
    (id: string) => write(() => supabase.from('recipe_items').delete().eq('id', id)),
    [write],
  )

  // Undo for `remove`: the recipe comes back under its own id, with its
  // ingredients. Days it was logged on keep their line either way; the link
  // from those lines to the recipe is not restored.
  const restore = useCallback(
    async (recipe: Recipe) => {
      if (!userId) return false
      const { error } = await supabase
        .from('recipes')
        .insert({ id: recipe.id, user_id: userId, name: recipe.name })
      if (error) return false
      return write(() =>
        supabase.from('recipe_items').insert(
          recipe.items.map((item) => ({
            recipe_id: recipe.id,
            food_id: item.food.id,
            quantity_g: item.quantityG,
            created_at: item.createdAt,
          })),
        ),
      )
    },
    [userId, write],
  )

  // A logged meal kept as a recipe, written in one call: the database names it
  // after the meal when the name is empty, and leaves nothing behind when any
  // part fails. Returns the name it chose, for the confirmation.
  const saveFromMeal = useCallback(
    async (name: string, meal: string, items: { foodId: string; quantityG: number }[]) => {
      if (!userId) return null
      const { data, error } = await supabase.rpc('save_recipe', {
        name,
        meal,
        items: items.map((item) => ({ food_id: item.foodId, quantity_g: item.quantityG })),
      })
      if (!data || error) return null
      changed()
      return { id: data.id, name: data.name }
    },
    [userId],
  )

  return { ...state, create, update, remove, restore, addItem, updateItem, removeItem, saveFromMeal }
}

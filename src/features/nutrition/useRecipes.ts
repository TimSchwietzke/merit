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
  food: CatalogueFood
}

export interface Recipe {
  id: string
  name: string
  /** The made weight, when the recipe is a pot that gets portioned by grams. */
  totalG: number | null
  items: RecipeItem[]
  /** The whole recipe's nutrition, from its ingredients. */
  totals: DayTotals
}

type Row = {
  id: string
  name: string
  total_g: number | null
  recipe_items: { id: string; quantity_g: number; created_at: string; foods: FoodRow }[]
}

const SELECT = `id, name, total_g, recipe_items ( id, quantity_g, created_at, foods!inner ( ${FOOD_SELECT} ) )`

const toRecipe = (row: Row): Recipe => {
  const items = [...row.recipe_items]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((item) => ({ id: item.id, quantityG: item.quantity_g, food: toCatalogueFood(item.foods) }))
  return {
    id: row.id,
    name: row.name,
    totalG: row.total_g,
    items,
    totals: sumPortions(items.map((item) => ({ nutrients: item.food.nutrients, quantityG: item.quantityG }))),
  }
}

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
      if (!error) reload()
      return !error
    },
    [reload],
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
      reload()
      return data.id
    },
    [reload, userId],
  )

  const update = useCallback(
    (id: string, fields: { name?: string; totalG?: number | null }) =>
      write(() =>
        supabase
          .from('recipes')
          .update({
            ...(fields.name !== undefined ? { name: fields.name.trim() } : {}),
            ...(fields.totalG !== undefined ? { total_g: fields.totalG } : {}),
          })
          .eq('id', id),
      ),
    [write],
  )

  const remove = useCallback(
    (id: string) => write(() => supabase.from('recipes').delete().eq('id', id)),
    [write],
  )

  const addItem = useCallback(
    (recipeId: string, foodId: string, quantityG: number) =>
      write(() => supabase.from('recipe_items').insert({ recipe_id: recipeId, food_id: foodId, quantity_g: quantityG })),
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

  return { ...state, create, update, remove, addItem, updateItem, removeItem }
}

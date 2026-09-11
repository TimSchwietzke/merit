import { supabase } from '@/lib/supabase'
import type { UsdaFood } from '@/lib/usda'
import { FOOD_SELECT, toCatalogueFood, type CatalogueFood, type FoodRow } from '@/features/nutrition/catalogue'

/**
 * A USDA search result, written into the catalogue so it can be logged.
 *
 * A day's entries point at a row in `foods`, so a result has to become one
 * before there is anything to log a portion of. It is cached rather than
 * copied per user: the catalogue is shared, and the second person to search for
 * chicken breast gets the row the first person's search created instead of
 * another round trip to api.data.gov (CLAUDE.md).
 *
 * `fdc_id` is what makes that work, and what makes it safe to do twice at once.
 */
export async function resolveUsdaFood(
  food: UsdaFood,
  userId: string,
): Promise<CatalogueFood | null> {
  const cached = await supabase.from('foods').select(FOOD_SELECT).eq('fdc_id', food.fdcId).maybeSingle()
  if (cached.data) return toCatalogueFood(cached.data as FoodRow)

  const { data, error } = await supabase
    .from('foods')
    .insert({
      name: food.name,
      // FDC's whole foods carry no brand and no packet, so no serving either:
      // a banana is logged in grams.
      brand: null,
      fdc_id: food.fdcId,
      kcal_100g: food.nutrients.kcal,
      fat_100g: food.nutrients.fat,
      carbs_100g: food.nutrients.carbs,
      protein_100g: food.nutrients.protein,
      saturated_fat_100g: food.nutrients.saturatedFat,
      sugars_100g: food.nutrients.sugars,
      fibre_100g: food.nutrients.fibre,
      salt_100g: food.nutrients.salt,
      source: 'usda',
      created_by: userId,
    })
    .select(FOOD_SELECT)
    .single()

  // A unique violation means somebody else cached the same food between the
  // read above and this write, which is a hit and not a failure.
  if (error?.code === '23505') {
    const raced = await supabase.from('foods').select(FOOD_SELECT).eq('fdc_id', food.fdcId).maybeSingle()
    if (raced.data) return toCatalogueFood(raced.data as FoodRow)
  }

  if (!data || error) return null
  return toCatalogueFood(data as FoodRow)
}

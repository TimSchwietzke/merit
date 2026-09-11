import { normaliseBarcode } from '@/lib/barcode'
import { lookupOffProduct } from '@/lib/off'
import { supabase } from '@/lib/supabase'
import {
  FOOD_SELECT,
  toCatalogueFood,
  type CatalogueFood,
  type FoodRow,
} from '@/features/nutrition/catalogue'

/**
 * A barcode to a food, in the order GOAL.md §4 sets out.
 *
 * 1. Merit's own catalogue. Every resolved product is written back here, so the
 *    same barcode never hits Open Food Facts twice — for this user or for
 *    anyone else, since the catalogue is shared.
 * 2. Open Food Facts.
 * 3. Neither: the caller offers manual entry, which is how the catalogue grows.
 */
export type Resolution =
  | { kind: 'found'; food: CatalogueFood }
  | { kind: 'missing'; barcode: string }
  | { kind: 'offline' }

export async function resolveBarcode(code: string, userId: string): Promise<Resolution> {
  const barcode = normaliseBarcode(code)

  const cached = await supabase.from('foods').select(FOOD_SELECT).eq('barcode', barcode).maybeSingle()
  if (cached.data) return { kind: 'found', food: toCatalogueFood(cached.data as FoodRow) }

  const looked = await lookupOffProduct(barcode)
  if (looked.kind === 'offline') return { kind: 'offline' }
  if (looked.kind === 'missing') return { kind: 'missing', barcode }

  const { food } = looked
  const { data, error } = await supabase
    .from('foods')
    .insert({
      barcode: food.barcode,
      name: food.name,
      brand: food.brand,
      kcal_100g: food.nutrients.kcal,
      fat_100g: food.nutrients.fat,
      carbs_100g: food.nutrients.carbs,
      protein_100g: food.nutrients.protein,
      saturated_fat_100g: food.nutrients.saturatedFat,
      sugars_100g: food.nutrients.sugars,
      fibre_100g: food.nutrients.fibre,
      salt_100g: food.nutrients.salt,
      serving_size_g: food.servingSizeG,
      serving_label: food.servingLabel,
      source: 'off',
      created_by: userId,
    })
    .select(FOOD_SELECT)
    .single()

  // A unique violation here means somebody else cached the same product between
  // the read above and this write — which is a hit, not a failure. Read it back
  // rather than reporting a barcode that plainly resolved as broken.
  if (error?.code === '23505') {
    const raced = await supabase.from('foods').select(FOOD_SELECT).eq('barcode', barcode).maybeSingle()
    if (raced.data) return { kind: 'found', food: toCatalogueFood(raced.data as FoodRow) }
  }

  if (!data || error) return { kind: 'offline' }
  return { kind: 'found', food: toCatalogueFood(data as FoodRow) }
}

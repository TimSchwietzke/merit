import { normaliseBarcode } from '@/lib/barcode'
import { lookupOffProduct } from '@/lib/off'
import { supabase } from '@/lib/supabase'
import type { CatalogueFood } from '@/features/nutrition/useFoodSearch'

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

const SELECT = `id, name, brand, source, serving_size_g, serving_label,
  kcal_100g, fat_100g, carbs_100g, protein_100g,
  saturated_fat_100g, sugars_100g, fibre_100g, salt_100g`

type Row = {
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

const toFood = (row: Row): CatalogueFood => ({
  id: row.id,
  name: row.name,
  brand: row.brand,
  source: row.source,
  servingSizeG: row.serving_size_g,
  servingLabel: row.serving_label,
  nutrients: {
    kcal: row.kcal_100g,
    fat: row.fat_100g,
    carbs: row.carbs_100g,
    protein: row.protein_100g,
    saturatedFat: row.saturated_fat_100g,
    sugars: row.sugars_100g,
    fibre: row.fibre_100g,
    salt: row.salt_100g,
  },
})

export async function resolveBarcode(code: string, userId: string): Promise<Resolution> {
  const barcode = normaliseBarcode(code)

  const cached = await supabase.from('foods').select(SELECT).eq('barcode', barcode).maybeSingle()
  if (cached.data) return { kind: 'found', food: toFood(cached.data as Row) }

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
    .select(SELECT)
    .single()

  // A unique violation here means somebody else cached the same product between
  // the read above and this write — which is a hit, not a failure. Read it back
  // rather than reporting a barcode that plainly resolved as broken.
  if (error?.code === '23505') {
    const raced = await supabase.from('foods').select(SELECT).eq('barcode', barcode).maybeSingle()
    if (raced.data) return { kind: 'found', food: toFood(raced.data as Row) }
  }

  if (!data || error) return { kind: 'offline' }
  return { kind: 'found', food: toFood(data as Row) }
}

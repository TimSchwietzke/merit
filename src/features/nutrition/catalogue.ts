import type { FoodNutrients } from '@/lib/nutrition'

/**
 * One row of the shared catalogue, and the one way to read it.
 *
 * Four places ask `foods` for the same columns and turn them into the same
 * object: the name search, the recently-used list, a barcode resolving, and a
 * USDA result being cached. They had four copies of the column list and four
 * copies of the mapping, which is four places to forget a column the day one is
 * added, and the day one was added is how this came to be shared.
 */
export interface CatalogueFood {
  id: string
  name: string
  brand: string | null
  source: string
  /** Both are identity from outside: a packet's barcode, a whole food's FDC id. */
  barcode: string | null
  fdcId: number | null
  servingSizeG: number | null
  servingLabel: string | null
  nutrients: FoodNutrients
}

export const FOOD_SELECT = `id, name, brand, source, barcode, fdc_id, serving_size_g, serving_label,
  kcal_100g, fat_100g, carbs_100g, protein_100g,
  saturated_fat_100g, sugars_100g, fibre_100g, salt_100g`

export interface FoodRow {
  id: string
  name: string
  brand: string | null
  source: string
  barcode: string | null
  fdc_id: number | null
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

export const toCatalogueFood = (row: FoodRow): CatalogueFood => ({
  id: row.id,
  name: row.name,
  brand: row.brand,
  source: row.source,
  barcode: row.barcode,
  fdcId: row.fdc_id,
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

/**
 * The shape the USDA Edge Function answers with.
 *
 * The mapping itself lives in `supabase/functions/usda/map.ts`, because it runs
 * there: FDC's own response carries every nutrient it holds for every result,
 * and the browser needs eight numbers. This is the contract between the two.
 */
export interface UsdaFood {
  fdcId: number
  name: string
  nutrients: {
    kcal: number
    fat: number
    carbs: number
    protein: number
    saturatedFat: number | null
    sugars: number | null
    fibre: number | null
    salt: number | null
  }
}

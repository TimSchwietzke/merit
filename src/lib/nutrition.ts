/**
 * The nutrition maths (CLAUDE.md, Code: calculations live in `lib/`).
 *
 * Two rules run through all of it.
 *
 * **Everything is stored per 100 g** and scaled on the way out (GOAL.md §5), at
 * full precision. Rounding happens in the formatter, never here — round a
 * hundred logged portions on the way in and the day's total is wrong by the
 * time anybody reads it.
 *
 * **A missing nutrient is not a zero.** Open Food Facts leaves fibre, sugars,
 * saturates and salt out often enough that treating absent as nothing would
 * quietly under-report half the days in the app. A total therefore carries how
 * many of its portions actually had the value, and a screen showing it says so
 * (DESIGN.md §10.10).
 */

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const
export type MealType = (typeof MEAL_TYPES)[number]

/** Bounds shared with the check constraints on `foods` and `food_logs`. */
export const QUANTITY_LIMITS = { min: 1, max: 10000, decimals: 1 } as const
export const KCAL_LIMITS = { min: 0, max: 1000, decimals: 2 } as const
export const NUTRIENT_LIMITS = { min: 0, max: 100, decimals: 2 } as const

/** The four with user-set targets, always present, and the four without. */
export const REQUIRED_NUTRIENTS = ['kcal', 'fat', 'carbs', 'protein'] as const
export const OPTIONAL_NUTRIENTS = ['saturatedFat', 'sugars', 'fibre', 'salt'] as const

export type RequiredNutrient = (typeof REQUIRED_NUTRIENTS)[number]
export type OptionalNutrient = (typeof OPTIONAL_NUTRIENTS)[number]
export type Nutrient = RequiredNutrient | OptionalNutrient

/**
 * EU label order — fat, saturates, carbohydrate, sugars, fibre, protein, salt —
 * so the screen reads in the same order as the packaging that was just scanned
 * (GOAL.md §4). Energy sits above it rather than in it.
 */
export const LABEL_ORDER: readonly Nutrient[] = [
  'fat',
  'saturatedFat',
  'carbs',
  'sugars',
  'fibre',
  'protein',
  'salt',
]

/** Per 100 g, as the `foods` row holds them. Optional ones may be absent. */
export interface FoodNutrients {
  kcal: number
  fat: number
  carbs: number
  protein: number
  saturatedFat: number | null
  sugars: number | null
  fibre: number | null
  salt: number | null
}

export interface Portion {
  nutrients: FoodNutrients
  /** Grams or millilitres actually eaten. */
  quantityG: number
}

/**
 * A summed nutrient, and how much of the day it actually covers.
 *
 * `known` and `total` are the honest part: 3 of 7 means four portions had no
 * value for this nutrient and the sum is of the other three. A screen renders
 * that as `partial · 3 of 7 foods` rather than as a number that reads complete.
 */
export interface NutrientTotal {
  value: number
  known: number
  total: number
}

export const isComplete = (total: NutrientTotal) => total.known === total.total

export type DayTotals = Record<Nutrient, NutrientTotal>

/** One nutrient of one portion, scaled from per-100g to what was eaten. */
export function scale(per100g: number | null, quantityG: number): number | null {
  if (per100g === null) return null
  return (per100g * quantityG) / 100
}

/** Every nutrient of one portion. */
export function portionTotals(portion: Portion): Record<Nutrient, number | null> {
  const { nutrients, quantityG } = portion
  return {
    kcal: scale(nutrients.kcal, quantityG),
    fat: scale(nutrients.fat, quantityG),
    carbs: scale(nutrients.carbs, quantityG),
    protein: scale(nutrients.protein, quantityG),
    saturatedFat: scale(nutrients.saturatedFat, quantityG),
    sugars: scale(nutrients.sugars, quantityG),
    fibre: scale(nutrients.fibre, quantityG),
    salt: scale(nutrients.salt, quantityG),
  }
}

/**
 * Sum a set of portions — a meal, a day, a week; the function does not care
 * which. Portions with no value for a nutrient are left out of that nutrient's
 * sum and counted, rather than added as zero.
 */
export function sumPortions(portions: readonly Portion[]): DayTotals {
  const nutrients = [...REQUIRED_NUTRIENTS, ...OPTIONAL_NUTRIENTS]
  const totals = Object.fromEntries(
    nutrients.map((nutrient) => [nutrient, { value: 0, known: 0, total: portions.length }]),
  ) as DayTotals

  for (const portion of portions) {
    const scaled = portionTotals(portion)
    for (const nutrient of nutrients) {
      const value = scaled[nutrient]
      if (value === null) continue
      totals[nutrient].value += value
      totals[nutrient].known += 1
    }
  }

  return totals
}

/**
 * The energy in a macro split, from the macros rather than from `kcal`.
 *
 * Atwater factors: 4 kcal per gram of protein and of carbohydrate, 9 per gram
 * of fat. Used for the macro ring's proportions only (§10.10) — the calorie
 * figure on screen is always the food's own, because a label's energy value and
 * its macros rarely reconcile exactly and the label is what the user ate.
 */
export const ATWATER = { protein: 4, carbs: 4, fat: 9 } as const

export function macroEnergySplit(totals: DayTotals): Record<'protein' | 'carbs' | 'fat', number> {
  return {
    protein: totals.protein.value * ATWATER.protein,
    carbs: totals.carbs.value * ATWATER.carbs,
    fat: totals.fat.value * ATWATER.fat,
  }
}

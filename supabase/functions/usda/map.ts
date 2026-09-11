/**
 * FoodData Central search results, mapped onto Merit's shape.
 *
 * This runs inside the Edge Function rather than in the browser. A search for
 * twenty foods carries every nutrient FDC holds for each of them, a few hundred
 * kilobytes, and Merit stores eight numbers: mapping at the proxy is the
 * difference between a search that works in a gym and one that does not.
 *
 * It is imported by Deno as well as by the test suite, so it has no imports of
 * its own. No `@/` alias, no npm, nothing to resolve differently in the two
 * runtimes. The two range constants below therefore repeat the check
 * constraints on `foods` rather than importing them, and must be changed with
 * them.
 */

export interface UsdaNutrients {
  kcal: number
  fat: number
  carbs: number
  protein: number
  saturatedFat: number | null
  sugars: number | null
  fibre: number | null
  salt: number | null
}

export interface UsdaFood {
  fdcId: number
  name: string
  nutrients: UsdaNutrients
}

/** One entry of the `foodNutrients` array, as far as this file reads it. */
export interface RawNutrient {
  nutrientId?: number | string
  nutrientNumber?: number | string
  unitName?: string
  value?: number | string
}

export interface RawFood {
  fdcId?: number | string
  description?: string
  foodNutrients?: RawNutrient[]
}

/** Mirrors `foods.kcal_100g` and the gram columns' check constraints. */
const KCAL_MAX = 1000
const GRAM_MAX = 100

/**
 * Nutrient numbers, current and legacy.
 *
 * The search endpoint reports both `nutrientId` (1003) and `nutrientNumber`
 * (203, the older INFOODS tagname) and which of the two carries the familiar
 * value depends on the dataset a row came from, so both are matched.
 *
 * Energy has four: Foundation foods stopped publishing 1008 in 2020 and give
 * the Atwater figures instead, and some rows carry only kilojoules.
 */
const IDS = {
  kcal: [1008, 2047, 2048, 208],
  kj: [1062, 268],
  fat: [1004, 204],
  carbs: [1005, 1050, 205],
  protein: [1003, 203],
  saturatedFat: [1258, 606],
  sugars: [2000, 1063, 269],
  fibre: [1079, 291],
  sodium: [1093, 307],
} as const

/** kcal per kJ. */
const KJ_TO_KCAL = 1 / 4.184

/** Salt = sodium × 2.5 (GS1/EU convention). FDC reports sodium in milligrams. */
const SODIUM_TO_SALT = 2.5

const num = (value: number | string | undefined): number | null => {
  if (value === undefined || value === null || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** Null rather than a value the catalogue would refuse to store. */
const inRange = (value: number | null, max: number) =>
  value === null || value < 0 || value > max ? null : value

function find(nutrients: RawNutrient[], ids: readonly number[], unit?: string): number | null {
  for (const nutrient of nutrients) {
    const id = num(nutrient.nutrientId)
    const legacy = num(nutrient.nutrientNumber)
    const matches = (id !== null && ids.includes(id)) || (legacy !== null && ids.includes(legacy))
    if (!matches) continue
    if (unit && (nutrient.unitName ?? '').toUpperCase() !== unit) continue
    const value = num(nutrient.value)
    if (value !== null) return value
  }
  return null
}

/**
 * One search result, or null if it is not a food Merit can log.
 *
 * The four nutrients that carry user-set targets are required, the same rule
 * the barcode path applies: a row with no energy value cannot be counted
 * against a calorie budget, and inventing a zero for it is the lie GOAL.md §4
 * rules out. Everything else stays null when FDC does not have it, because a
 * missing nutrient is not a zero.
 */
export function mapUsdaFood(food: RawFood): UsdaFood | null {
  const fdcId = num(food.fdcId)
  const name = (food.description ?? '').trim().slice(0, 200)
  if (fdcId === null || fdcId <= 0 || name === '') return null

  const nutrients = food.foodNutrients ?? []

  // Any energy row measured in kilojoules, whichever id it carries: a figure
  // tagged 1008 but published in kJ is the one mistake that would put 372 kcal
  // on a banana.
  const kj = find(nutrients, [...IDS.kcal, ...IDS.kj], 'KJ')
  const kcal = inRange(
    find(nutrients, IDS.kcal, 'KCAL') ?? (kj === null ? null : kj * KJ_TO_KCAL),
    KCAL_MAX,
  )
  const fat = inRange(find(nutrients, IDS.fat), GRAM_MAX)
  const carbs = inRange(find(nutrients, IDS.carbs), GRAM_MAX)
  const protein = inRange(find(nutrients, IDS.protein), GRAM_MAX)
  if (kcal === null || fat === null || carbs === null || protein === null) return null

  const sodiumMg = find(nutrients, IDS.sodium)

  return {
    fdcId,
    name,
    nutrients: {
      kcal,
      fat,
      carbs,
      protein,
      saturatedFat: inRange(find(nutrients, IDS.saturatedFat), GRAM_MAX),
      sugars: inRange(find(nutrients, IDS.sugars), GRAM_MAX),
      fibre: inRange(find(nutrients, IDS.fibre), GRAM_MAX),
      salt: inRange(sodiumMg === null ? null : (sodiumMg / 1000) * SODIUM_TO_SALT, GRAM_MAX),
    },
  }
}

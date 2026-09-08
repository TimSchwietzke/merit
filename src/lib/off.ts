import { KCAL_LIMITS, NUTRIENT_LIMITS, type FoodNutrients } from '@/lib/nutrition'

/**
 * Open Food Facts, mapped onto Merit's shape.
 *
 * Read requests need no key (GOAL.md §4) and are made from the browser on
 * purpose, so the 15-per-minute limit applies per user rather than to a server
 * everybody shares.
 *
 * A browser cannot set `User-Agent` — it is a forbidden header name, so the
 * custom agent the OFF docs ask for is impossible here. Their documented
 * alternative for browser apps is to identify the caller in the query string
 * instead, which is what `IDENTITY` below is.
 *
 * The licence is ODbL: anywhere a value from here is shown, the source is named
 * and linked (`ATTRIBUTION_URL`).
 */

const BASE = 'https://world.openfoodfacts.org/api/v2/product'

/** The `User-Agent` substitute (see above). */
const IDENTITY = 'app_name=Merit&app_version=1.0'

export const ATTRIBUTION_URL = 'https://world.openfoodfacts.org'

/** Only what Merit stores, so the response is a few hundred bytes on a phone. */
const FIELDS = [
  'code',
  'product_name',
  'product_name_de',
  'product_name_en',
  'brands',
  'serving_size',
  'serving_quantity',
  'nutriments',
].join(',')

/** The shape of the bits of the response this module reads. */
interface OffProduct {
  code?: string
  product_name?: string
  product_name_de?: string
  product_name_en?: string
  brands?: string
  serving_size?: string
  serving_quantity?: number | string
  nutriments?: Record<string, number | string | undefined>
}

export interface OffFood {
  barcode: string
  name: string
  brand: string | null
  nutrients: FoodNutrients
  servingSizeG: number | null
  servingLabel: string | null
}

/** kcal per kJ. Used only when a product carries kJ and no kcal. */
const KJ_TO_KCAL = 1 / 4.184

/** Salt = sodium × 2.5 (GS1/EU convention), for products that declare sodium. */
const SODIUM_TO_SALT = 2.5

const num = (value: number | string | undefined): number | null => {
  if (value === undefined || value === null || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * A value that survives the table's own check constraint, or null.
 *
 * Open Food Facts is crowd-sourced and carries genuine nonsense — 1000 g of fat
 * per 100 g, energy in the tens of thousands, negative values. Storing those
 * would put a food in the shared catalogue that poisons every day it is logged
 * to, and the insert would be rejected anyway.
 */
const inRange = (value: number | null, { min, max }: { min: number; max: number }) =>
  value === null || value < min || value > max ? null : value

/**
 * Map a product, or null if it cannot be logged.
 *
 * The four nutrients with user-set targets are required — a product with no
 * energy value cannot be counted against a calorie budget, and inventing a zero
 * for it is exactly the lie GOAL.md §4 rules out. The rest stay null when the
 * packaging did not declare them.
 */
export function mapOffProduct(product: OffProduct): OffFood | null {
  const barcode = (product.code ?? '').trim()
  const name = (product.product_name_de || product.product_name || product.product_name_en || '').trim()
  if (!barcode || !name) return null

  const n = product.nutriments ?? {}

  // kcal outright, or converted from the kJ that European labels lead with.
  const kj = num(n['energy-kj_100g']) ?? num(n['energy_100g'])
  const kcal = inRange(num(n['energy-kcal_100g']) ?? (kj === null ? null : kj * KJ_TO_KCAL), KCAL_LIMITS)

  const fat = inRange(num(n['fat_100g']), NUTRIENT_LIMITS)
  const carbs = inRange(num(n['carbohydrates_100g']), NUTRIENT_LIMITS)
  const protein = inRange(num(n['proteins_100g']), NUTRIENT_LIMITS)
  if (kcal === null || fat === null || carbs === null || protein === null) return null

  const sodium = num(n['sodium_100g'])
  const salt = inRange(
    num(n['salt_100g']) ?? (sodium === null ? null : sodium * SODIUM_TO_SALT),
    NUTRIENT_LIMITS,
  )

  // `fiber`, not `fibre`: Open Food Facts uses the American spelling and the
  // rest of Merit does not.
  const nutrients: FoodNutrients = {
    kcal,
    fat,
    carbs,
    protein,
    saturatedFat: inRange(num(n['saturated-fat_100g']), NUTRIENT_LIMITS),
    sugars: inRange(num(n['sugars_100g']), NUTRIENT_LIMITS),
    fibre: inRange(num(n['fiber_100g']), NUTRIENT_LIMITS),
    salt,
  }

  // The table takes a serving weight and its label together or not at all.
  const servingSizeG = inRange(num(product.serving_quantity), { min: 0.1, max: 5000 })
  const servingLabel = (product.serving_size ?? '').trim() || null

  return {
    barcode,
    name: name.slice(0, 200),
    brand: (product.brands ?? '').split(',')[0]?.trim().slice(0, 120) || null,
    nutrients,
    servingSizeG: servingLabel ? servingSizeG : null,
    servingLabel: servingSizeG ? servingLabel : null,
  }
}

export type LookupResult =
  | { kind: 'found'; food: OffFood }
  /** The barcode is not in Open Food Facts, or its entry has no usable values. */
  | { kind: 'missing' }
  | { kind: 'offline' }

/** Look a barcode up. Never throws: a failed lookup is an empty state (§14). */
export async function lookupOffProduct(barcode: string, signal?: AbortSignal): Promise<LookupResult> {
  try {
    const response = await fetch(`${BASE}/${barcode}.json?fields=${FIELDS}&${IDENTITY}`, { signal })

    // 404 is the answer "no such product" and is the only status that means it.
    // Everything else — 429 from the 15-per-minute limit, a 5xx, the 503 their
    // search endpoint hands out under load — is the service being unavailable,
    // and reporting that as "this food does not exist" sends somebody off to
    // hand-type a product Open Food Facts already has.
    if (response.status === 404) return { kind: 'missing' }
    if (!response.ok) return { kind: 'offline' }

    const body = (await response.json()) as { status?: number; product?: OffProduct }
    if (body.status !== 1 || !body.product) return { kind: 'missing' }

    const food = mapOffProduct({ ...body.product, code: body.product.code ?? barcode })
    return food ? { kind: 'found', food } : { kind: 'missing' }
  } catch {
    // Aborted, offline, blocked, CORS. None of them are "no such product", and
    // telling the user their food does not exist when their train went into a
    // tunnel is the wrong sentence.
    return { kind: 'offline' }
  }
}

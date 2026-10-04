import { formatNumber } from '@/lib/format'

/**
 * How much of a recipe was eaten, the three ways a person says it: "2 shakes",
 * "an eighth of the pot", "200 g of it".
 */
export type RecipePortion =
  | { kind: 'servings'; count: number }
  | { kind: 'fraction'; of: number }
  | { kind: 'grams'; grams: number }

/**
 * The share of the whole recipe a portion is, or null if it cannot be one:
 * grams need the recipe's made weight, and nothing is a share of zero.
 */
export function recipeShare(portion: RecipePortion, totalG: number | null): number | null {
  switch (portion.kind) {
    case 'servings':
      return portion.count > 0 ? portion.count : null
    case 'fraction':
      return portion.of >= 1 ? 1 / portion.of : null
    case 'grams':
      return totalG && totalG > 0 && portion.grams > 0 ? portion.grams / totalG : null
  }
}

/**
 * A logged recipe's portion as the line shows it: `200 g` when it was given
 * in grams, `1/8` for a share of one in n, otherwise `2×` or `0,5×`.
 */
export function formatRecipePortion(factor: number, grams: number | null, locale: string): string {
  if (grams !== null) return `${formatNumber(grams, locale, 0)} g`
  const of = 1 / factor
  if (factor < 1 && Math.abs(of - Math.round(of)) < 1e-6) return `1/${Math.round(of)}`
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(factor)}×`
}

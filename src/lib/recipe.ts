/**
 * How much of a recipe was eaten: the whole of it a number of times ("two
 * shakes"), or one part of it split into n ("an eighth of the pot").
 *
 * Never grams: ingredients are weighed raw, and a cooked pot weighs more than
 * they add up to, so a plate weighed in grams would be overcounted.
 */
export type RecipePortion = { kind: 'whole'; times: number } | { kind: 'part'; of: number }

/** The share of the whole recipe a portion is, or null if it cannot be one. */
export function recipeShare(portion: RecipePortion): number | null {
  if (portion.kind === 'whole') return portion.times > 0 ? portion.times : null
  return portion.of >= 1 ? 1 / portion.of : null
}

/** A share back into the portion a person would have typed for it. */
export function portionOf(share: number): RecipePortion {
  const of = 1 / share
  return share < 1 && Math.abs(of - Math.round(of)) < 1e-6
    ? { kind: 'part', of: Math.round(of) }
    : { kind: 'whole', times: share }
}

/** A logged recipe's portion as the line shows it: `1/8`, `2×`, `0,5×`. */
export function formatRecipePortion(share: number, locale: string): string {
  const portion = portionOf(share)
  if (portion.kind === 'part') return `1/${portion.of}`
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(portion.times)}×`
}


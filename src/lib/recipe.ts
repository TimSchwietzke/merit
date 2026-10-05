/**
 * How much of a recipe was eaten: the whole of it a number of times ("two
 * shakes"), or some parts of it split into n ("two fifths of the pot").
 *
 * Never grams: ingredients are weighed raw, and a cooked pot weighs more than
 * they add up to, so a plate weighed in grams would be overcounted.
 */
export type RecipePortion = { kind: 'whole'; times: number } | { kind: 'part'; eaten: number; of: number }

/** Parts a pot can be split into; past this it is a typo. */
export const MAX_PARTS = 100

/** The share of the whole recipe a portion is, or null if it cannot be one. */
export function recipeShare(portion: RecipePortion): number | null {
  if (portion.kind === 'whole') return portion.times > 0 ? portion.times : null
  const { eaten, of } = portion
  return eaten >= 1 && of >= 1 && eaten <= of ? eaten / of : null
}

/**
 * A logged line's portion as it was typed: its parts when it was given in
 * parts (2 of 8 stays 2 of 8), otherwise the whole recipe times its share.
 * Read back from what was stored, never reconstructed from the share alone.
 */
export function storedPortion(factor: number, eaten: number | null, total: number | null): RecipePortion {
  return eaten !== null && total !== null ? { kind: 'part', eaten, of: total } : { kind: 'whole', times: factor }
}

/** A portion as the line shows it: `2/8`, `2×`, `0,33×`. */
export function formatRecipePortion(portion: RecipePortion, locale: string): string {
  if (portion.kind === 'part') return `${portion.eaten}/${portion.of}`
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(portion.times)}×`
}

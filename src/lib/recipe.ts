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
 * A stored share back into the portion a person would have typed for it.
 *
 * The share is kept to five decimals, so a fraction is recognised when it lies
 * within that rounding of k/d for the smallest d up to MAX_PARTS: 0.4 is 2/5,
 * 0.28571 is 2/7. Two distinct such fractions are always further apart than
 * that, so the match is unambiguous.
 */
export function portionOf(share: number): RecipePortion {
  if (share < 1) {
    for (let of = 2; of <= MAX_PARTS; of += 1) {
      const eaten = Math.round(share * of)
      if (eaten >= 1 && Math.abs(share - eaten / of) < 1e-5) return { kind: 'part', eaten, of }
    }
  }
  return { kind: 'whole', times: share }
}

/** A logged recipe's portion as the line shows it: `2/5`, `2×`, `0,45×`. */
export function formatRecipePortion(share: number, locale: string): string {
  const portion = portionOf(share)
  if (portion.kind === 'part') return `${portion.eaten}/${portion.of}`
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(portion.times)}×`
}

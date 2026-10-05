import { QUANTITY_LIMITS } from '@/lib/nutrition'

/** The parts of a logged entry the save sheet needs. */
export interface MealEntry {
  quantityG: number
  food: { id: string; name: string; brand: string | null }
  /** The logged recipe line this row belongs to, or null for a plain entry. */
  group: { id: string } | null
}

export interface MealIngredient {
  foodId: string
  name: string
  brand: string | null
  quantityG: number
  /** More than a recipe row may hold; the sheet refuses to save it. */
  overLimit: boolean
}

/**
 * A meal's entries as recipe ingredients, in day-view order: a recipe line's
 * rows together at its first row, each a single ingredient, and a food that
 * occurs more than once listed once, at its first occurrence, amounts summed.
 */
export function mealIngredients(entries: readonly MealEntry[]): MealIngredient[] {
  // The day view's lines: a recipe line's rows sit where its first row did.
  const lines: MealEntry[][] = []
  const groups = new Map<string, MealEntry[]>()
  for (const entry of entries) {
    const line = entry.group ? groups.get(entry.group.id) : undefined
    if (line) line.push(entry)
    else {
      const created = [entry]
      lines.push(created)
      if (entry.group) groups.set(entry.group.id, created)
    }
  }

  const byFood = new Map<string, MealIngredient>()
  for (const { quantityG, food } of lines.flat()) {
    const known = byFood.get(food.id)
    if (known) known.quantityG += quantityG
    else byFood.set(food.id, { foodId: food.id, name: food.name, brand: food.brand, quantityG, overLimit: false })
  }

  return [...byFood.values()].map((item) => {
    // Back to the column's 0.1 g, so 0.1 + 0.2 stays 0.3. Not display rounding.
    const quantityG = Math.round(item.quantityG * 10) / 10
    return { ...item, quantityG, overLimit: quantityG > QUANTITY_LIMITS.max }
  })
}

/**
 * The name `save_recipe` gives an unnamed recipe, previewed from the recipes
 * the app has loaded: "<meal> #<n>", n one more than the highest N among names
 * equal to "<meal> #N" ignoring case and surrounding spaces, N a positive
 * integer without leading zeros. The meal is compared as text, never as a
 * pattern, the same way the database does it.
 */
export function defaultRecipeName(meal: string, names: readonly string[]): string {
  const prefix = `${trimSpaces(meal)} #`
  const lower = prefix.toLowerCase()
  let highest = 0n
  for (const name of names) {
    const trimmed = trimSpaces(name)
    if (trimmed.slice(0, prefix.length).toLowerCase() !== lower) continue
    const rest = trimmed.slice(prefix.length)
    if (!/^[1-9][0-9]*$/.test(rest)) continue
    // BigInt: "Snack #99999999999999999999" must still count exactly.
    const n = BigInt(rest)
    if (n > highest) highest = n
  }
  return `${prefix}${highest + 1n}`
}

/** Postgres `trim(text)`: plain spaces only, not tabs or NBSP like `.trim()`. */
const trimSpaces = (text: string) => text.replace(/^ +| +$/g, '')

/** A lowercase meal label as a name starts it: "frühstück" to "Frühstück". */
export function mealTitle(label: string, locale: string): string {
  return label.charAt(0).toLocaleUpperCase(locale) + label.slice(1)
}

import { describe, expect, it } from 'vitest'

import { defaultRecipeName, mealIngredients, mealTitle, type MealEntry } from '@/lib/meal-recipe'

const food = (id: string, name = id, brand: string | null = null) => ({ id, name, brand })
const entry = (foodId: string, quantityG: number, group: string | null = null, name?: string): MealEntry => ({
  quantityG,
  food: food(foodId, name),
  group: group ? { id: group } : null,
})
const summary = (entries: MealEntry[]) => mealIngredients(entries).map((item) => [item.foodId, item.quantityG])

describe('mealIngredients', () => {
  it('lists nothing for an empty meal', () => {
    expect(mealIngredients([])).toEqual([])
  })

  it('keeps names and brands and starts below the limit', () => {
    expect(mealIngredients([{ quantityG: 40, food: food('oats', 'Oats', 'Kölln'), group: null }])).toEqual([
      { foodId: 'oats', name: 'Oats', brand: 'Kölln', quantityG: 40, overLimit: false },
    ])
  })

  it('breaks a recipe line into its rows, at the position of its first row', () => {
    // The shake's rows were logged around the apple; the day view shows them together.
    const entries = [entry('milk', 300, 'shake'), entry('apple', 150), entry('whey', 30, 'shake'), entry('bread', 60)]
    expect(summary(entries)).toEqual([
      ['milk', 300],
      ['whey', 30],
      ['apple', 150],
      ['bread', 60],
    ])
  })

  it('gathers two interleaved recipe lines, each at its first row', () => {
    const entries = [
      entry('milk', 300, 'shake'),
      entry('oats', 40, 'bowl'),
      entry('whey', 30, 'shake'),
      entry('berries', 80, 'bowl'),
    ]
    expect(summary(entries)).toEqual([
      ['milk', 300],
      ['whey', 30],
      ['oats', 40],
      ['berries', 80],
    ])
  })

  it('merges a food across a plain entry and a recipe line, at its first position', () => {
    const entries = [entry('banana', 100), entry('milk', 300, 'shake'), entry('banana', 80, 'shake'), entry('milk', 50)]
    expect(summary(entries)).toEqual([
      ['banana', 180],
      ['milk', 350],
    ])
  })

  it('places a merged food by the day-view order, not the logged order', () => {
    // Milk is logged first inside the line, which the view shows after the apple.
    const entries = [entry('apple', 150), entry('whey', 30, 'shake'), entry('milk', 50), entry('milk', 300, 'shake')]
    expect(summary(entries)).toEqual([
      ['apple', 150],
      ['whey', 30],
      ['milk', 350],
    ])
  })

  it('does not merge two foods that only share a name', () => {
    const entries = [entry('oats-a', 40, null, 'Oats'), entry('oats-b', 50, null, 'Oats')]
    expect(summary(entries)).toEqual([
      ['oats-a', 40],
      ['oats-b', 50],
    ])
  })

  it('sums without float noise', () => {
    expect(summary([entry('salt', 0.1), entry('salt', 0.2)])).toEqual([['salt', 0.3]])
    expect(summary([entry('oil', 12.3), entry('oil', 4.1, 'x'), entry('oil', 0.7)])).toEqual([['oil', 17.1]])
  })

  it('flags an amount above 10000 g, not one of exactly 10000 g', () => {
    const [exact] = mealIngredients([entry('water', 6000), entry('water', 4000)])
    expect(exact).toMatchObject({ quantityG: 10000, overLimit: false })
    const [over] = mealIngredients([entry('water', 6000), entry('water', 4000.1)])
    expect(over).toMatchObject({ quantityG: 10000.1, overLimit: true })
  })
})

describe('defaultRecipeName', () => {
  it('starts at 1 when nothing matches', () => {
    expect(defaultRecipeName('Snack', [])).toBe('Snack #1')
    expect(defaultRecipeName('Snack', ['Protein shake', 'Abend #4'])).toBe('Snack #1')
  })

  it('continues after the highest number, ignoring case and surrounding spaces', () => {
    expect(defaultRecipeName('Snack', ['Snack #2', 'snack #5'])).toBe('Snack #6')
    expect(defaultRecipeName('Snack', ['  Snack #3  '])).toBe('Snack #4')
    expect(defaultRecipeName(' Snack ', ['Snack #1'])).toBe('Snack #2')
  })

  it('trims plain spaces only, as Postgres trim() does', () => {
    const names = ['\u00a0Snack #3', '\tSnack #4', 'Snack #5\t', '   Snack #2 ']
    expect(defaultRecipeName('Snack', names)).toBe('Snack #3')
    expect(defaultRecipeName('\u00a0Snack', ['Snack #2'])).toBe('\u00a0Snack #1')
  })

  it('counts only a positive number without leading zeros, right after "<meal> #"', () => {
    const names = ['Snack #02', 'Snack #0', 'Snack #3 alt', 'Snacks #9', 'Snack  #7', 'Abend Snack #10']
    expect(defaultRecipeName('Snack', names)).toBe('Snack #1')
    expect(defaultRecipeName('Snack', ['Snack #', 'Snack #-2', 'Snack #1.5', 'Snack#4'])).toBe('Snack #1')
  })

  it('compares non-ASCII letters case-insensitively', () => {
    expect(defaultRecipeName('Frühstück', ['FRÜHSTÜCK #3'])).toBe('Frühstück #4')
  })

  it('matches the meal literally, never as a pattern', () => {
    expect(defaultRecipeName('A.b (c)+', ['A.b (c)+ #2', 'AXb (c)) #9', 'Aab (c)c #8'])).toBe('A.b (c)+ #3')
    expect(defaultRecipeName('.*', ['anything #9'])).toBe('.* #1')
  })

  it('counts a number too large for a float exactly', () => {
    expect(defaultRecipeName('Snack', ['Snack #99999999999999999999'])).toBe('Snack #100000000000000000000')
  })
})

describe('mealTitle', () => {
  it('capitalises the first letter of a meal label', () => {
    expect(mealTitle('frühstück', 'de')).toBe('Frühstück')
    expect(mealTitle('snack', 'en')).toBe('Snack')
    expect(mealTitle('übernacht', 'de')).toBe('Übernacht')
  })

  it('follows the locale', () => {
    expect(mealTitle('ikindi', 'tr')).toBe('İkindi')
  })
})

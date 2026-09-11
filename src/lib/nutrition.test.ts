import { describe, expect, it } from 'vitest'

import {
  isComplete,
  LABEL_ORDER,
  macroEnergySplit,
  portionTotals,
  scale,
  sumPortions,
  type FoodNutrients,
  type Portion,
} from '@/lib/nutrition'

const food = (over: Partial<FoodNutrients> = {}): FoodNutrients => ({
  kcal: 100,
  fat: 10,
  carbs: 20,
  protein: 5,
  saturatedFat: 2,
  sugars: 8,
  fibre: 3,
  salt: 0.5,
  ...over,
})

const portion = (quantityG: number, over: Partial<FoodNutrients> = {}): Portion => ({
  nutrients: food(over),
  quantityG,
})

describe('scale', () => {
  it('reads the stored values as per 100 g', () => {
    expect(scale(100, 250)).toBe(250)
    expect(scale(100, 50)).toBe(50)
    expect(scale(0, 250)).toBe(0)
  })

  it('keeps a missing value missing', () => {
    // The whole point: absent is not zero.
    expect(scale(null, 250)).toBeNull()
  })

  it('does not round on the way through', () => {
    // 37 g of a 71 kcal/100 g food is 26.27 kcal. Rounding a hundred portions
    // on the way in is how a day's total drifts before anyone reads it.
    expect(scale(71, 37)).toBeCloseTo(26.27, 10)
  })
})

describe('portionTotals', () => {
  it('scales every nutrient by the quantity eaten', () => {
    expect(portionTotals(portion(250))).toEqual({
      kcal: 250,
      fat: 25,
      carbs: 50,
      protein: 12.5,
      saturatedFat: 5,
      sugars: 20,
      fibre: 7.5,
      salt: 1.25,
    })
  })
})

describe('sumPortions', () => {
  it('adds the portions up', () => {
    const totals = sumPortions([portion(100), portion(200)])
    expect(totals.kcal.value).toBe(300)
    expect(totals.protein.value).toBe(15)
    expect(isComplete(totals.kcal)).toBe(true)
  })

  it('leaves a missing nutrient out of its sum instead of adding zero', () => {
    // Two 100 g portions, one with no fibre value. The fibre total is the one
    // portion that had it, and it says so, not 3 g reported as though both
    // foods had been measured.
    const totals = sumPortions([portion(100), portion(100, { fibre: null })])
    expect(totals.fibre).toEqual({ value: 3, known: 1, total: 2 })
    expect(isComplete(totals.fibre)).toBe(false)
    expect(isComplete(totals.kcal)).toBe(true)
  })

  it('reports a nutrient no portion carried as known: 0, not as complete', () => {
    const totals = sumPortions([portion(100, { salt: null }), portion(100, { salt: null })])
    expect(totals.salt).toEqual({ value: 0, known: 0, total: 2 })
    expect(isComplete(totals.salt)).toBe(false)
  })

  it('is complete and empty for a day with nothing logged', () => {
    const totals = sumPortions([])
    expect(totals.kcal).toEqual({ value: 0, known: 0, total: 0 })
    // Nothing is missing from a day with no foods in it, so nothing is partial.
    expect(isComplete(totals.kcal)).toBe(true)
  })

  it('counts every portion in `total`, including the ones that had the value', () => {
    const totals = sumPortions([portion(100), portion(100), portion(100, { sugars: null })])
    expect(totals.sugars.total).toBe(3)
    expect(totals.sugars.known).toBe(2)
  })
})

describe('macroEnergySplit', () => {
  it('uses the Atwater factors', () => {
    const totals = sumPortions([portion(100)])
    expect(macroEnergySplit(totals)).toEqual({ protein: 20, carbs: 80, fat: 90 })
  })
})

describe('LABEL_ORDER', () => {
  it('is the EU declaration order, with each sub-value under its total', () => {
    // The screen has to read like the packaging it was copied from.
    expect(LABEL_ORDER).toEqual([
      'fat',
      'saturatedFat',
      'carbs',
      'sugars',
      'fibre',
      'protein',
      'salt',
    ])
  })
})

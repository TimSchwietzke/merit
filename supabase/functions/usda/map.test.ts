import { describe, expect, it } from 'vitest'

import { mapUsdaFood, type RawFood } from './map'

/** A row shaped like SR Legacy's, which is what most searches come back with. */
const banana: RawFood = {
  fdcId: 173944,
  description: 'Bananas, raw',
  foodNutrients: [
    { nutrientId: 1008, nutrientNumber: '208', unitName: 'KCAL', value: 89 },
    { nutrientId: 1004, nutrientNumber: '204', unitName: 'G', value: 0.33 },
    { nutrientId: 1005, nutrientNumber: '205', unitName: 'G', value: 22.84 },
    { nutrientId: 1003, nutrientNumber: '203', unitName: 'G', value: 1.09 },
    { nutrientId: 1258, nutrientNumber: '606', unitName: 'G', value: 0.112 },
    { nutrientId: 2000, nutrientNumber: '269', unitName: 'G', value: 12.23 },
    { nutrientId: 1079, nutrientNumber: '291', unitName: 'G', value: 2.6 },
    { nutrientId: 1093, nutrientNumber: '307', unitName: 'MG', value: 1 },
  ],
}

describe('mapUsdaFood', () => {
  it('maps a search result onto the eight values Merit stores', () => {
    expect(mapUsdaFood(banana)).toEqual({
      fdcId: 173944,
      name: 'Bananas, raw',
      nutrients: {
        kcal: 89,
        fat: 0.33,
        carbs: 22.84,
        protein: 1.09,
        saturatedFat: 0.112,
        sugars: 12.23,
        fibre: 2.6,
        salt: 0.0025,
      },
    })
  })

  it('takes the Atwater energy Foundation foods publish instead of 1008', () => {
    const food = {
      ...banana,
      foodNutrients: banana.foodNutrients!.filter((n) => n.nutrientId !== 1008).concat({
        nutrientId: 2047,
        unitName: 'KCAL',
        value: 92,
      }),
    }
    expect(mapUsdaFood(food)?.nutrients.kcal).toBe(92)
  })

  it('converts kilojoules when that is the only energy on the row', () => {
    const food = {
      ...banana,
      foodNutrients: banana.foodNutrients!.filter((n) => n.nutrientId !== 1008).concat({
        nutrientId: 1062,
        unitName: 'kJ',
        value: 372,
      }),
    }
    expect(mapUsdaFood(food)?.nutrients.kcal).toBeCloseTo(88.9, 1)
  })

  it('never reads a kilojoule figure as kilocalories', () => {
    const food = {
      ...banana,
      foodNutrients: banana.foodNutrients!.map((n) =>
        n.nutrientId === 1008 ? { nutrientId: 1008, unitName: 'kJ', value: 372 } : n,
      ),
    }
    expect(mapUsdaFood(food)?.nutrients.kcal).toBeCloseTo(88.9, 1)
  })

  it('matches rows that carry only the legacy nutrient numbers', () => {
    const food: RawFood = {
      fdcId: 1,
      description: 'Legacy',
      foodNutrients: [
        { nutrientNumber: '208', unitName: 'KCAL', value: 100 },
        { nutrientNumber: '204', unitName: 'G', value: 1 },
        { nutrientNumber: '205', unitName: 'G', value: 2 },
        { nutrientNumber: '203', unitName: 'G', value: 3 },
      ],
    }
    expect(mapUsdaFood(food)?.nutrients.kcal).toBe(100)
  })

  it('drops a food that is missing one of the four required values', () => {
    for (const id of [1008, 1004, 1005, 1003]) {
      const food = {
        ...banana,
        foodNutrients: banana.foodNutrients!.filter((n) => n.nutrientId !== id),
      }
      expect(mapUsdaFood(food), String(id)).toBeNull()
    }
  })

  it('leaves an optional nutrient null rather than calling it zero', () => {
    const food = {
      ...banana,
      foodNutrients: banana.foodNutrients!.filter(
        (n) => ![1258, 2000, 1079, 1093].includes(Number(n.nutrientId)),
      ),
    }
    expect(mapUsdaFood(food)?.nutrients).toMatchObject({
      saturatedFat: null,
      sugars: null,
      fibre: null,
      salt: null,
    })
  })

  it('refuses values the catalogue would not store', () => {
    const absurd = {
      ...banana,
      foodNutrients: banana.foodNutrients!.map((n) =>
        n.nutrientId === 1008 ? { ...n, value: 9000 } : n,
      ),
    }
    expect(mapUsdaFood(absurd)).toBeNull()

    const negativeFibre = {
      ...banana,
      foodNutrients: banana.foodNutrients!.map((n) =>
        n.nutrientId === 1079 ? { ...n, value: -3 } : n,
      ),
    }
    expect(mapUsdaFood(negativeFibre)?.nutrients.fibre).toBeNull()
  })

  it('drops a row with no id or no description', () => {
    expect(mapUsdaFood({ ...banana, fdcId: undefined })).toBeNull()
    expect(mapUsdaFood({ ...banana, description: '   ' })).toBeNull()
  })
})

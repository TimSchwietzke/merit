import { afterEach, describe, expect, it, vi } from 'vitest'

import { lookupOffProduct, mapOffProduct } from '@/lib/off'

/** Trimmed from the real response for 3017620422003. */
const nutella = {
  code: '3017620422003',
  product_name: 'Nutella',
  product_name_de: 'Nutella',
  brands: 'Nutella, Ferrero, Yum yum',
  serving_size: '15 g',
  serving_quantity: 15,
  nutriments: {
    'energy-kcal_100g': 539,
    'energy-kj_100g': 2252,
    fat_100g: 30.9,
    'saturated-fat_100g': 10.6,
    carbohydrates_100g: 57.5,
    sugars_100g: 56.3,
    proteins_100g: 6.3,
    salt_100g: 0.107,
    sodium_100g: 0.0428,
  },
}

describe('mapOffProduct', () => {
  it('maps a real product', () => {
    const food = mapOffProduct(nutella)
    expect(food).not.toBeNull()
    expect(food?.barcode).toBe('3017620422003')
    expect(food?.name).toBe('Nutella')
    // Only the first brand: the field is a comma-separated pile of synonyms.
    expect(food?.brand).toBe('Nutella')
    expect(food?.nutrients.kcal).toBe(539)
    expect(food?.nutrients.salt).toBe(0.107)
    expect(food?.servingSizeG).toBe(15)
    expect(food?.servingLabel).toBe('15 g')
  })

  it('leaves an undeclared nutrient null rather than zero', () => {
    // Nutella declares no fibre. Storing 0 would report the day as containing
    // none, which is a different claim from not knowing (GOAL.md §4).
    expect(mapOffProduct(nutella)?.nutrients.fibre).toBeNull()
  })

  it('converts kJ when a product carries no kcal', () => {
    const food = mapOffProduct({
      ...nutella,
      nutriments: { ...nutella.nutriments, 'energy-kcal_100g': undefined },
    })
    expect(food?.nutrients.kcal).toBeCloseTo(2252 / 4.184, 6)
  })

  it('derives salt from sodium when only sodium is declared', () => {
    const food = mapOffProduct({
      ...nutella,
      nutriments: { ...nutella.nutriments, salt_100g: undefined, sodium_100g: 0.4 },
    })
    expect(food?.nutrients.salt).toBeCloseTo(1, 10)
  })

  it('reads the American spelling of fibre', () => {
    const food = mapOffProduct({
      ...nutella,
      nutriments: { ...nutella.nutriments, fiber_100g: 3.4 },
    })
    expect(food?.nutrients.fibre).toBe(3.4)
  })

  it('prefers the German name where the product has one', () => {
    const food = mapOffProduct({ ...nutella, product_name: 'Hazelnut spread', product_name_de: 'Nuss-Nougat-Creme' })
    expect(food?.name).toBe('Nuss-Nougat-Creme')
  })

  it('refuses a product missing any of the four that carry targets', () => {
    // Without energy there is nothing to count against a budget, and inventing
    // a zero for it is the lie this whole module is careful about.
    for (const missing of ['energy-kcal_100g', 'fat_100g', 'carbohydrates_100g', 'proteins_100g']) {
      const nutriments: Record<string, number | undefined> = { ...nutella.nutriments }
      nutriments[missing] = undefined
      if (missing === 'energy-kcal_100g') {
        nutriments['energy-kj_100g'] = undefined
        nutriments['energy_100g'] = undefined
      }
      expect(mapOffProduct({ ...nutella, nutriments })).toBeNull()
    }
  })

  it('drops crowd-sourced nonsense instead of storing it', () => {
    // 1000 g of fat in 100 g of food. The column would refuse it anyway; the
    // point is that it does not reach the shared catalogue.
    expect(mapOffProduct({ ...nutella, nutriments: { ...nutella.nutriments, fat_100g: 1000 } })).toBeNull()
    const negative = mapOffProduct({ ...nutella, nutriments: { ...nutella.nutriments, sugars_100g: -3 } })
    expect(negative?.nutrients.sugars).toBeNull()
  })

  it('refuses a product with no name', () => {
    expect(mapOffProduct({ ...nutella, product_name: '', product_name_de: '' })).toBeNull()
  })

  it('takes a serving weight and its label together or not at all', () => {
    // The table carries a constraint saying exactly this: a label with no
    // weight cannot be logged, a weight with no label has nothing to put on a
    // button.
    const noLabel = mapOffProduct({ ...nutella, serving_size: '' })
    expect(noLabel?.servingSizeG).toBeNull()
    expect(noLabel?.servingLabel).toBeNull()
  })
})

describe('lookupOffProduct', () => {
  const ok = (body: unknown) =>
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify(body), { status: 200 }))

  afterEach(() => vi.unstubAllGlobals())

  it('maps a product the API returns', async () => {
    ok({ status: 1, product: nutella })
    const result = await lookupOffProduct('3017620422003')
    expect(result.kind).toBe('found')
  })

  it('reads 404 as no such product', async () => {
    vi.stubGlobal('fetch', async () => new Response('{"status":0}', { status: 404 }))
    expect((await lookupOffProduct('3017620422003')).kind).toBe('missing')
  })

  it('does not report a rate limit or an outage as a missing product', async () => {
    // The 15-per-minute limit and their 503s are the service being away.
    // Telling somebody their food does not exist sends them off to hand-type a
    // product Open Food Facts already has.
    for (const status of [429, 500, 503]) {
      vi.stubGlobal('fetch', async () => new Response('', { status }))
      expect((await lookupOffProduct('3017620422003')).kind).toBe('offline')
    }
  })

  it('reads a product the API has but cannot be logged as missing', async () => {
    ok({ status: 1, product: { ...nutella, nutriments: {} } })
    expect((await lookupOffProduct('3017620422003')).kind).toBe('missing')
  })

  it('never throws when the network does', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new Error('offline')
    })
    expect((await lookupOffProduct('3017620422003')).kind).toBe('offline')
  })
})

describe('brands, in either shape', () => {
  it('takes the first of the comma-separated string the product API sends', () => {
    expect(mapOffProduct(nutella)?.brand).toBe('Nutella')
  })

  it('takes the first of the array the search API sends', () => {
    expect(mapOffProduct({ ...nutella, brands: ['Ferrero', 'Nutella'] })?.brand).toBe('Ferrero')
  })

  it('is null when there is no brand at all', () => {
    expect(mapOffProduct({ ...nutella, brands: [] })?.brand).toBeNull()
    expect(mapOffProduct({ ...nutella, brands: '' })?.brand).toBeNull()
  })
})

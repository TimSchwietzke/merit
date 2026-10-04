import { describe, expect, it } from 'vitest'

import { formatRecipePortion, recipeShare } from '@/lib/recipe'

describe('recipeShare', () => {
  it('counts servings as multiples of the whole recipe', () => {
    expect(recipeShare({ kind: 'servings', count: 2 }, null)).toBe(2)
    expect(recipeShare({ kind: 'servings', count: 0.5 }, null)).toBe(0.5)
  })

  it('turns one in n into a share', () => {
    expect(recipeShare({ kind: 'fraction', of: 8 }, 1850)).toBe(0.125)
  })

  it('divides grams by the made weight', () => {
    expect(recipeShare({ kind: 'grams', grams: 200 }, 1600)).toBe(0.125)
  })

  it('refuses grams without a made weight, and anything at or below zero', () => {
    expect(recipeShare({ kind: 'grams', grams: 200 }, null)).toBeNull()
    expect(recipeShare({ kind: 'servings', count: 0 }, null)).toBeNull()
    expect(recipeShare({ kind: 'fraction', of: 0 }, 1000)).toBeNull()
    expect(recipeShare({ kind: 'grams', grams: 0 }, 1000)).toBeNull()
  })
})

describe('formatRecipePortion', () => {
  it('shows grams when the portion was weighed', () => {
    expect(formatRecipePortion(0.125, 200, 'de')).toBe('200 g')
  })

  it('shows one in n as a fraction', () => {
    expect(formatRecipePortion(0.125, null, 'de')).toBe('1/8')
    expect(formatRecipePortion(1 / 3, null, 'de')).toBe('1/3')
  })

  it('shows other shares as a multiple, in the locale', () => {
    expect(formatRecipePortion(1, null, 'de')).toBe('1×')
    expect(formatRecipePortion(2, null, 'en')).toBe('2×')
    expect(formatRecipePortion(1.5, null, 'de')).toBe('1,5×')
    expect(formatRecipePortion(0.75, null, 'en')).toBe('0.75×')
  })
})

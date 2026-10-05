import { describe, expect, it } from 'vitest'

import { formatRecipePortion, portionOf, recipeShare } from '@/lib/recipe'

describe('recipeShare', () => {
  it('counts the whole recipe as multiples', () => {
    expect(recipeShare({ kind: 'whole', times: 2 })).toBe(2)
    expect(recipeShare({ kind: 'whole', times: 0.5 })).toBe(0.5)
  })

  it('turns parts eaten of parts made into a share', () => {
    expect(recipeShare({ kind: 'part', eaten: 1, of: 8 })).toBe(0.125)
    expect(recipeShare({ kind: 'part', eaten: 2, of: 5 })).toBe(0.4)
  })

  it('refuses nothing eaten, nothing made, or more eaten than made', () => {
    expect(recipeShare({ kind: 'whole', times: 0 })).toBeNull()
    expect(recipeShare({ kind: 'part', eaten: 0, of: 5 })).toBeNull()
    expect(recipeShare({ kind: 'part', eaten: 1, of: 0 })).toBeNull()
    expect(recipeShare({ kind: 'part', eaten: 6, of: 5 })).toBeNull()
  })
})

describe('portionOf', () => {
  it('reads the fraction back out of a share, in lowest terms', () => {
    expect(portionOf(0.4)).toEqual({ kind: 'part', eaten: 2, of: 5 })
    expect(portionOf(0.125)).toEqual({ kind: 'part', eaten: 1, of: 8 })
    expect(portionOf(0.75)).toEqual({ kind: 'part', eaten: 3, of: 4 })
  })

  it('recognises a share stored to five decimals', () => {
    expect(portionOf(0.28571)).toEqual({ kind: 'part', eaten: 2, of: 7 })
    expect(portionOf(0.33333)).toEqual({ kind: 'part', eaten: 1, of: 3 })
  })

  it('keeps the whole recipe and anything that is no fraction as a multiple', () => {
    expect(portionOf(1)).toEqual({ kind: 'whole', times: 1 })
    expect(portionOf(2)).toEqual({ kind: 'whole', times: 2 })
    expect(portionOf(0.004)).toEqual({ kind: 'whole', times: 0.004 })
  })
})

describe('formatRecipePortion', () => {
  it('shows parts as a fraction', () => {
    expect(formatRecipePortion(0.4, 'de')).toBe('2/5')
    expect(formatRecipePortion(0.125, 'de')).toBe('1/8')
  })

  it('shows the whole as a multiple, in the locale', () => {
    expect(formatRecipePortion(1, 'de')).toBe('1×')
    expect(formatRecipePortion(1.5, 'de')).toBe('1,5×')
  })
})

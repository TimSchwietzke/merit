import { describe, expect, it } from 'vitest'

import { formatRecipePortion, recipeShare, storedPortion } from '@/lib/recipe'

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

describe('storedPortion', () => {
  it('keeps parts exactly as they were typed', () => {
    expect(storedPortion(0.25, 2, 8)).toEqual({ kind: 'part', eaten: 2, of: 8 })
  })

  it('reads a line without parts as the whole recipe times its share', () => {
    expect(storedPortion(0.33, null, null)).toEqual({ kind: 'whole', times: 0.33 })
    expect(storedPortion(2, null, null)).toEqual({ kind: 'whole', times: 2 })
  })
})

describe('formatRecipePortion', () => {
  it('shows parts as typed, not reduced', () => {
    expect(formatRecipePortion({ kind: 'part', eaten: 2, of: 8 }, 'de')).toBe('2/8')
  })

  it('shows the whole as a multiple, in the locale', () => {
    expect(formatRecipePortion({ kind: 'whole', times: 1 }, 'de')).toBe('1×')
    expect(formatRecipePortion({ kind: 'whole', times: 0.33 }, 'de')).toBe('0,33×')
    expect(formatRecipePortion({ kind: 'whole', times: 1.5 }, 'en')).toBe('1.5×')
  })
})

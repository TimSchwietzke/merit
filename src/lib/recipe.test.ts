import { describe, expect, it } from 'vitest'

import { formatRecipePortion, portionOf, recipeShare } from '@/lib/recipe'

describe('recipeShare', () => {
  it('counts the whole recipe as multiples', () => {
    expect(recipeShare({ kind: 'whole', times: 2 })).toBe(2)
    expect(recipeShare({ kind: 'whole', times: 0.5 })).toBe(0.5)
  })

  it('turns one part in n into a share', () => {
    expect(recipeShare({ kind: 'part', of: 8 })).toBe(0.125)
  })

  it('refuses anything at or below zero', () => {
    expect(recipeShare({ kind: 'whole', times: 0 })).toBeNull()
    expect(recipeShare({ kind: 'part', of: 0 })).toBeNull()
  })
})

describe('portionOf', () => {
  it('reads one in n back out of a share', () => {
    expect(portionOf(0.125)).toEqual({ kind: 'part', of: 8 })
    expect(portionOf(1 / 3)).toEqual({ kind: 'part', of: 3 })
  })

  it('keeps everything else as a multiple of the whole', () => {
    expect(portionOf(1)).toEqual({ kind: 'whole', times: 1 })
    expect(portionOf(0.75)).toEqual({ kind: 'whole', times: 0.75 })
    expect(portionOf(2)).toEqual({ kind: 'whole', times: 2 })
  })
})

describe('formatRecipePortion', () => {
  it('shows one in n as a fraction', () => {
    expect(formatRecipePortion(0.125, 'de')).toBe('1/8')
  })

  it('shows other shares as a multiple, in the locale', () => {
    expect(formatRecipePortion(1, 'de')).toBe('1×')
    expect(formatRecipePortion(1.5, 'de')).toBe('1,5×')
    expect(formatRecipePortion(0.75, 'en')).toBe('0.75×')
  })
})

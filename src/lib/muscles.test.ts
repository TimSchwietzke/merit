import { describe, expect, it } from 'vitest'

import { groupOf, onBody } from '@/lib/muscles'

describe('onBody', () => {
  it('translates catalogue muscles to silhouette regions', () => {
    expect(onBody(['chest', 'triceps'])).toEqual(['chest', 'triceps'])
    expect(onBody(['shoulders'])).toEqual(['deltoids'])
  })

  it('collapses two muscles that share one region into one', () => {
    // The map draws regions, so lats and middle back light the same one.
    expect(onBody(['lats', 'middle back'])).toEqual(['upper-back'])
  })

  it('drops a muscle the map cannot draw rather than guessing', () => {
    expect(onBody(['chest', 'nonsense'])).toEqual(['chest'])
  })
})

describe('groupOf', () => {
  it('files a lift under what it is mainly for', () => {
    expect(groupOf(['chest', 'triceps'])).toBe('chest')
    expect(groupOf(['quadriceps', 'glutes'])).toBe('legs')
  })

  it('calls three or more groups full body', () => {
    expect(groupOf(['chest', 'quadriceps', 'abdominals'])).toBe('full_body')
  })

  it('falls back to full body rather than inventing a group', () => {
    expect(groupOf([])).toBe('full_body')
    expect(groupOf(['nonsense'])).toBe('full_body')
  })
})

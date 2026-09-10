import { describe, expect, it } from 'vitest'

import { pathSegments, screenLabelKey } from '@/components/shell/route-path'

describe('pathSegments', () => {
  it('starts every path at the app and links every segment but the last', () => {
    const segments = pathSegments('/goals')
    expect(segments.map((segment) => segment.labelKey)).toEqual([
      'app.name',
      'nav.account',
      'nav.goals',
    ])
    expect(segments.slice(0, -1).every((segment) => segment.to)).toBe(true)
    expect(segments[segments.length - 1].to).toBeUndefined()
  })

  it('marks the day-scoped screens as day-scoped', () => {
    for (const path of ['/', '/food', '/training', '/weight']) {
      expect(pathSegments(path).at(-1)?.labelKey).toBe('common.today')
    }
    expect(pathSegments('/account').at(-1)?.labelKey).toBe('nav.account')
  })

  it('falls back to not-found for an address that does not exist', () => {
    expect(pathSegments('/nowhere').map((segment) => segment.labelKey)).toEqual([
      'app.name',
      'common.notFound',
    ])
  })
})

describe('screenLabelKey', () => {
  it('names the screen, not the day it is scoped to', () => {
    expect(screenLabelKey('/')).toBe('nav.dashboard')
    expect(screenLabelKey('/food')).toBe('nav.food')
  })

  it('names a nested screen after itself, not after the section above it', () => {
    // `/goals` hangs under the account; below `lg` the header has room for one
    // label and it has to be the screen the visitor is looking at.
    expect(screenLabelKey('/goals')).toBe('nav.goals')
    expect(screenLabelKey('/account')).toBe('nav.account')
  })

  it('falls back to the app name rather than to nothing', () => {
    expect(screenLabelKey('/nowhere')).toBe('common.notFound')
  })
})

describe('paths with an id in them', () => {
  it('answer as the screen they sit under, not as not-found', () => {
    // `/training/routines/<uuid>` is not a key in the table, and an exact-match
    // lookup called the routine editor "not found" in its own header.
    expect(pathSegments('/training/routines/abc-123').map((s) => s.labelKey)).toEqual([
      'app.name',
      'nav.training',
      'nav.routines',
    ])
    expect(screenLabelKey('/training/routines/abc-123')).toBe('nav.routines')
  })

  it('take the longest path they sit under, not the first', () => {
    // `/training` and `/training/routines` both match; the deeper one is right.
    expect(pathSegments('/training/routines/x').at(-1)?.labelKey).toBe('nav.routines')
  })

  it('still fall back to not-found for an address under nothing', () => {
    expect(pathSegments('/nowhere/deeper').map((s) => s.labelKey)).toEqual([
      'app.name',
      'common.notFound',
    ])
  })
})

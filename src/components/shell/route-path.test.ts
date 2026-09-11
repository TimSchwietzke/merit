import { describe, expect, it } from 'vitest'

import { backTo, pathSegments, screenLabelKey } from '@/components/shell/route-path'

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

  it('hangs the account sub-screens under the account, not under the app', () => {
    // The prefix fallback would answer `/account/profile` with the account's
    // own two segments and call the screen `konto`, which is the screen it
    // just left.
    expect(pathSegments('/account/profile').map((segment) => segment.labelKey)).toEqual([
      'app.name',
      'nav.account',
      'nav.profile',
    ])
    expect(screenLabelKey('/account/data')).toBe('nav.data')
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

describe('backTo', () => {
  it('leads a nested screen back to the section it hangs under', () => {
    expect(backTo('/account/profile')?.to).toBe('/account')
    expect(backTo('/goals')?.to).toBe('/account')
    expect(backTo('/food/add')?.to).toBe('/food')
    expect(backTo('/training/routines/17')?.to).toBe('/training')
  })

  it('names the parent, so the control can say where it goes', () => {
    expect(backTo('/account/appearance')?.labelKey).toBe('nav.account')
  })

  it('offers nothing on a tab screen, where the tab bar is the way off', () => {
    for (const path of ['/', '/food', '/training', '/weight', '/cardio', '/account']) {
      expect(backTo(path), path).toBeNull()
    }
  })

  it('does not mistake the day qualifier for the screen', () => {
    // `/food` is [merit, ernährung, heute]. Counting from the end without
    // skipping `heute` would make `ernährung` the parent of itself.
    expect(backTo('/food')).toBeNull()
  })

  it('offers nothing from a path that does not exist', () => {
    expect(backTo('/nowhere')).toBeNull()
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'

import { getStoredPref, hasStoredPref, prefersDark, resolveTheme, storePref } from '@/lib/theme'

const KEY = 'merit.theme'

function stubStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial))
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  })
  return store
}

/** Private mode and "block all cookies" both make these throw, not return null. */
function stubThrowingStorage() {
  const boom = () => {
    throw new Error('storage disabled')
  }
  vi.stubGlobal('localStorage', { getItem: boom, setItem: boom, removeItem: boom })
}

afterEach(() => vi.unstubAllGlobals())

describe('getStoredPref', () => {
  it('falls back to system when nothing is stored or the value is junk', () => {
    stubStorage()
    expect(getStoredPref()).toBe('system')
    stubStorage({ [KEY]: 'chartreuse' })
    expect(getStoredPref()).toBe('system')
  })

  it('returns a stored light or dark preference', () => {
    stubStorage({ [KEY]: 'dark' })
    expect(getStoredPref()).toBe('dark')
    stubStorage({ [KEY]: 'light' })
    expect(getStoredPref()).toBe('light')
  })

  it('never throws when storage is blocked', () => {
    stubThrowingStorage()
    expect(getStoredPref()).toBe('system')
  })
})

describe('storePref / hasStoredPref', () => {
  it('writes system rather than clearing it', () => {
    // The distinction is what stops the profile overwriting a device that has
    // deliberately chosen "follow the OS".
    const store = stubStorage()
    storePref('system')
    expect(store.get(KEY)).toBe('system')
    expect(hasStoredPref()).toBe(true)
    expect(getStoredPref()).toBe('system')
  })

  it('reports no stored preference on a device that has never chosen', () => {
    stubStorage()
    expect(hasStoredPref()).toBe(false)
    storePref('dark')
    expect(hasStoredPref()).toBe(true)
  })

  it('reports no stored preference when storage is blocked', () => {
    stubThrowingStorage()
    expect(hasStoredPref()).toBe(false)
    expect(() => storePref('dark')).not.toThrow()
  })
})

describe('resolveTheme', () => {
  it('passes an explicit preference straight through, whatever the OS says', () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) })
    expect(resolveTheme('light')).toBe('light')
    expect(resolveTheme('dark')).toBe('dark')
  })

  it('follows the OS when the preference is system', () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) })
    expect(resolveTheme('system')).toBe('dark')
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) })
    expect(resolveTheme('system')).toBe('light')
  })

  it('resolves to light where matchMedia is unavailable', () => {
    vi.stubGlobal('window', undefined)
    expect(prefersDark()).toBe(false)
    expect(resolveTheme('system')).toBe('light')
  })
})

/**
 * Theme mechanics. Two complete themes, three user preferences, resolved to a
 * `data-theme` attribute on <html>. See DESIGN.md §2.5.
 *
 * The pre-paint half of this lives inline in index.html and is duplicated on
 * purpose — it runs before the bundle exists, so it cannot import from here.
 * Any change to the resolution rules below has to be mirrored there.
 */

export type ThemePref = 'light' | 'dark' | 'system'
export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'merit.theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

/**
 * The only literal colours outside tokens.css, and the only ones permitted:
 * <meta name="theme-color"> takes a colour, not a var(). They mirror
 * --merit-bg in each theme and must be changed together with it.
 */
const THEME_COLOR: Record<Theme, string> = {
  light: '#fdfcf9',
  dark: '#121212',
}

/**
 * The one thing Merit keeps in localStorage. The theme is chrome, not
 * application data, and it has to be readable synchronously before paint —
 * see DESIGN.md §15. Nothing else goes in here, ever.
 */
export function getStoredPref(): ThemePref {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : 'system'
  } catch {
    // Private mode, blocked storage. Never let this stop a theme applying.
    return 'system'
  }
}

/**
 * Whether this device has a theme of its own.
 *
 * The distinction matters for sync: `profiles.theme` is the preference that
 * travels between devices, but applying it over a local choice would repaint
 * after first paint — the flash §17 calls out. So the stored value wins where
 * it exists, and the profile only seeds a device that has never chosen.
 */
export function hasStoredPref(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' || stored === 'system'
  } catch {
    return false
  }
}

export function storePref(pref: ThemePref): void {
  try {
    // 'system' is written rather than removed: an explicit "follow the OS" and
    // a device that has never chosen are different states, and only the second
    // should be seeded from the profile. The inline bootstrap in index.html
    // reads anything that is not 'light'/'dark' as system, so this is safe.
    localStorage.setItem(STORAGE_KEY, pref)
  } catch {
    // The preference is lost on reload; the current session still honours it.
  }
}

export function prefersDark(): boolean {
  try {
    return window.matchMedia(DARK_QUERY).matches
  } catch {
    return false
  }
}

export function resolveTheme(pref: ThemePref): Theme {
  if (pref === 'light' || pref === 'dark') return pref
  return prefersDark() ? 'dark' : 'light'
}

/** Applies a resolved theme to the document, meta tag included. */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', THEME_COLOR[theme])
}

/**
 * Report the OS preference as it changes, so a "system" preference re-applies
 * while the app is open (DESIGN.md §2.5). Returns an unsubscribe.
 */
export function watchSystemTheme(onChange: (theme: Theme) => void): () => void {
  let media: MediaQueryList
  try {
    media = window.matchMedia(DARK_QUERY)
  } catch {
    return () => {}
  }
  const handle = (event: MediaQueryListEvent) => onChange(event.matches ? 'dark' : 'light')
  media.addEventListener('change', handle)
  return () => media.removeEventListener('change', handle)
}

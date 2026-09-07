import { useCallback, useEffect, useState } from 'react'

import {
  applyTheme,
  getStoredPref,
  prefersDark,
  storePref,
  watchSystemTheme,
  type Theme,
  type ThemePref,
} from '@/lib/theme'

/**
 * The `light | dark | system` preference, kept in step with the document.
 * The theme is already correct on first paint (the bootstrap script in
 * index.html); this hook owns it from there on, and drives the control in
 * settings. See DESIGN.md §2.5.
 */
export function useTheme() {
  const [pref, setPrefState] = useState<ThemePref>(getStoredPref)
  const [systemTheme, setSystemTheme] = useState<Theme>(() => (prefersDark() ? 'dark' : 'light'))

  const theme: Theme = pref === 'system' ? systemTheme : pref

  // The OS preference is an external system: follow it for as long as the app
  // is open, and let `pref` decide whether it is the one that counts.
  useEffect(() => watchSystemTheme(setSystemTheme), [])

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setPref = useCallback((next: ThemePref) => {
    storePref(next)
    setPrefState(next)
  }, [])

  return { pref, theme, setPref }
}

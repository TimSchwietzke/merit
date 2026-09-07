import { createContext, useContext } from 'react'

import type { Locale } from '@/lib/i18n'
import type { ThemePref } from '@/lib/theme'

export interface PreferencesState {
  locale: Locale
  theme: ThemePref
  /** `error` means the profile row could not be read; the controls still work
   *  for this session, they just do not travel to another device. */
  status: 'loading' | 'ready' | 'error'
  /** True after a write failed and the control was rolled back. */
  saveFailed: boolean
  setLocale: (locale: Locale) => void
  setTheme: (theme: ThemePref) => void
}

export const PreferencesContext = createContext<PreferencesState | null>(null)

export function usePreferences(): PreferencesState {
  const state = useContext(PreferencesContext)
  if (!state) throw new Error('usePreferences must be used inside <PreferencesProvider>.')
  return state
}

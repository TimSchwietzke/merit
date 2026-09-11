import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { useSession } from '@/features/auth/useSession'
import { PreferencesContext, type PreferencesState } from '@/features/settings/usePreferences'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'
import { hasStoredPref, type ThemePref } from '@/lib/theme'
import { useTheme } from '@/lib/useTheme'

const isLocale = (value: string): value is Locale =>
  (SUPPORTED_LOCALES as readonly string[]).includes(value)

const isThemePref = (value: string): value is ThemePref =>
  value === 'light' || value === 'dark' || value === 'system'

/**
 * Language and theme, held for the app and persisted to `profiles`.
 *
 * The two are stored differently on purpose. The theme also lives in
 * `localStorage` because it has to be readable before first paint (§2.5), so
 * the profile only seeds a device that has never chosen one, see
 * `hasStoredPref`. The locale has no pre-paint constraint, so the profile is
 * simply the answer once it arrives, and browser detection is the fallback
 * until then.
 */
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { session } = useSession()
  const userId = session?.user.id
  const { i18n } = useTranslation()
  const { pref: themePref, setPref: setStoredTheme } = useTheme()

  const [status, setStatus] = useState<PreferencesState['status']>('loading')
  const [saveFailed, setSaveFailed] = useState(false)

  useEffect(() => {
    if (!userId) return
    let active = true

    void supabase
      .from('profiles')
      .select('locale, theme')
      .eq('user_id', userId)
      .single()
      .then(({ data, error }) => {
        if (!active) return
        if (error || !data) {
          setStatus('error')
          return
        }
        if (isLocale(data.locale) && data.locale !== i18n.language) {
          void i18n.changeLanguage(data.locale)
        }
        // Seeded onto a device that has never chosen, but only a real
        // choice, never the default.
        //
        // The local copy exists so the pre-paint bootstrap can read it and not
        // flash the wrong theme (§2.5). `system` needs no copy: it is what the
        // bootstrap already does when it finds nothing. Writing it anyway would
        // put something on the device that the user never asked for, which is
        // the one thing this app does not do and the privacy notice says so.
        if (!hasStoredPref() && isThemePref(data.theme) && data.theme !== 'system') {
          setStoredTheme(data.theme)
        }
        setStatus('ready')
      })

    return () => {
      active = false
    }
  }, [userId, i18n, setStoredTheme])

  // Both setters apply the change immediately and roll it back if the write
  // fails. A settings toggle that waits for a round trip before moving feels
  // broken on a phone connection.
  //
  // Each update ends in `.select().single()` rather than trusting `error` to be
  // null. An update that RLS refuses is not an error to PostgREST, it matches
  // zero rows and returns success, so without asking for the row back, a
  // silently denied write would look exactly like a saved one.
  const setLocale = useCallback(
    (next: Locale) => {
      const previous = i18n.language
      setSaveFailed(false)
      void i18n.changeLanguage(next)
      if (!userId) return

      void supabase
        .from('profiles')
        .update({ locale: next })
        .eq('user_id', userId)
        .select('user_id')
        .single()
        .then(({ data, error }) => {
          if (data && !error) return
          void i18n.changeLanguage(previous)
          setSaveFailed(true)
        })
    },
    [i18n, userId],
  )

  const setTheme = useCallback(
    (next: ThemePref) => {
      const previous = themePref
      setSaveFailed(false)
      setStoredTheme(next)
      if (!userId) return

      void supabase
        .from('profiles')
        .update({ theme: next })
        .eq('user_id', userId)
        .select('user_id')
        .single()
        .then(({ data, error }) => {
          if (data && !error) return
          setStoredTheme(previous)
          setSaveFailed(true)
        })
    },
    [themePref, setStoredTheme, userId],
  )

  const value = useMemo<PreferencesState>(
    () => ({
      locale: isLocale(i18n.language) ? i18n.language : DEFAULT_LOCALE,
      theme: themePref,
      status,
      saveFailed,
      setLocale,
      setTheme,
    }),
    [i18n.language, themePref, status, saveFailed, setLocale, setTheme],
  )

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

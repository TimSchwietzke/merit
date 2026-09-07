import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

import de from '@/locales/de.json'
import en from '@/locales/en.json'

export const SUPPORTED_LOCALES = ['de', 'en'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'de'

/**
 * Read the locale off the browser. Deliberately not persisted: DESIGN.md §15
 * allows exactly one thing in localStorage and that is the theme. The real
 * preference lives on `profiles.locale` once accounts exist.
 */
export function detectLocale(): Locale {
  const candidates = typeof navigator === 'undefined' ? [] : [navigator.language, ...(navigator.languages ?? [])]
  for (const candidate of candidates) {
    const base = candidate?.split('-')[0]?.toLowerCase()
    if (base && (SUPPORTED_LOCALES as readonly string[]).includes(base)) return base as Locale
  }
  return DEFAULT_LOCALE
}

function syncDocumentLanguage(locale: string): void {
  if (typeof document !== 'undefined') document.documentElement.lang = locale
}

void i18next.use(initReactI18next).init({
  resources: {
    de: { translation: de },
    en: { translation: en },
  },
  lng: detectLocale(),
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: SUPPORTED_LOCALES,
  defaultNS: 'translation',
  interpolation: {
    // React escapes for us.
    escapeValue: false,
  },
})

syncDocumentLanguage(i18next.language)
i18next.on('languageChanged', syncDocumentLanguage)

export default i18next

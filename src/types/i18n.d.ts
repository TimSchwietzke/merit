import 'i18next'

import type en from '@/locales/en.json'

/**
 * Makes `t()` key-checked against the English tree. A key that only exists in
 * one language is a compile error, which is the point — CLAUDE.md hard rule 3
 * says both languages carry every string from the moment it is written.
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: {
      translation: typeof en
    }
  }
}

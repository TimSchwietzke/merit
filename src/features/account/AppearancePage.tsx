import { useTranslation } from 'react-i18next'

import { Field } from '@/components/Field'
import { Panel } from '@/components/Panel'
import { ScreenTitle } from '@/components/ScreenTitle'
import { SegmentedControl } from '@/components/SegmentedControl'
import { usePreferences } from '@/features/settings/usePreferences'
import type { Locale } from '@/lib/i18n'
import type { ThemePref } from '@/lib/theme'

/**
 * Language and theme. Two controls, no save button — both apply on the tap and
 * roll back if the write fails (see PreferencesProvider).
 */
export default function AppearancePage() {
  const { t } = useTranslation()
  const { locale, theme, status, saveFailed, setLocale, setTheme } = usePreferences()

  return (
    <>
      <ScreenTitle>{t('nav.appearance')}</ScreenTitle>

      {/* Field puts the label above the control, not beside it: `design` plus
          three segments does not sit on one line at 375px (DESIGN.md §9, §10.2). */}
      <Panel className="mt-8">
        <Field label={t('pages.account.preferences.language')}>
          <SegmentedControl<Locale>
            label={t('pages.account.preferences.language')}
            value={locale}
            disabled={status === 'loading'}
            onChange={setLocale}
            segments={[
              { value: 'de', label: t('pages.account.preferences.languages.de') },
              { value: 'en', label: t('pages.account.preferences.languages.en') },
            ]}
          />
        </Field>

        <Field label={t('pages.account.preferences.theme')}>
          <SegmentedControl<ThemePref>
            label={t('pages.account.preferences.theme')}
            value={theme}
            disabled={status === 'loading'}
            onChange={setTheme}
            segments={[
              { value: 'light', label: t('pages.account.preferences.themes.light') },
              { value: 'dark', label: t('pages.account.preferences.themes.dark') },
              { value: 'system', label: t('pages.account.preferences.themes.system') },
            ]}
          />
        </Field>
      </Panel>

      {saveFailed ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {t('pages.account.preferences.saveFailed')}
        </p>
      ) : null}
    </>
  )
}

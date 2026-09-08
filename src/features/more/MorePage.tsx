import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Field } from '@/components/Field'
import { NotBuiltYet } from '@/components/NotBuiltYet'
import { Panel } from '@/components/Panel'
import { Row, Rows } from '@/components/Rows'
import { ScreenTitle } from '@/components/ScreenTitle'
import { SectionHead } from '@/components/SectionHead'
import { SegmentedControl } from '@/components/SegmentedControl'
import { Button } from '@/components/ui/button'
import { authErrorKey, type AuthErrorKey } from '@/features/auth/auth-errors'
import { useSession } from '@/features/auth/useSession'
import { usePreferences } from '@/features/settings/usePreferences'
import type { Locale } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'
import type { ThemePref } from '@/lib/theme'

export default function MorePage() {
  const { t } = useTranslation()
  const { session } = useSession()
  const { locale, theme, status, saveFailed, setLocale, setTheme } = usePreferences()
  const [pending, setPending] = useState(false)
  const [errorKey, setErrorKey] = useState<AuthErrorKey | null>(null)

  async function signOut() {
    setPending(true)
    setErrorKey(null)

    const { error } = await supabase.auth.signOut()
    if (error) {
      setErrorKey(authErrorKey(error))
      setPending(false)
    }
    // Otherwise the session change redirects to /sign-in on its own.
  }

  return (
    <>
      <ScreenTitle>{t('nav.more')}</ScreenTitle>
      <NotBuiltYet label={t('common.notBuiltYet')}>{t('pages.more.planned')}</NotBuiltYet>

      <section className="mt-8">
        <SectionHead label={t('pages.more.tracking.label')} />
        <Rows>
          <Row to="/weight">
            {/* `nav.weight`, not a label of its own: the tab bar, the path bar
                and this row are one vocabulary, and a second copy is how two
                casings of the same word get into the app (§4.4). */}
            <span className="min-w-0 flex-1 truncate">{t('nav.weight')}</span>
            <span aria-hidden className="shrink-0 font-mono text-2xs text-ink-faint">
              →
            </span>
          </Row>
        </Rows>
      </section>

      <section className="mt-8">
        <SectionHead label={t('pages.more.preferences.label')} />
        {/* Field puts the label above the control, not beside it: `design` plus
            three segments does not sit on one line at 375px (DESIGN.md §9, §10.2). */}
        <Panel>
          <Field label={t('pages.more.preferences.language')}>
            <SegmentedControl<Locale>
              label={t('pages.more.preferences.language')}
              value={locale}
              disabled={status === 'loading'}
              onChange={setLocale}
              segments={[
                { value: 'de', label: t('pages.more.preferences.languages.de') },
                { value: 'en', label: t('pages.more.preferences.languages.en') },
              ]}
            />
          </Field>

          <Field label={t('pages.more.preferences.theme')}>
            <SegmentedControl<ThemePref>
              label={t('pages.more.preferences.theme')}
              value={theme}
              disabled={status === 'loading'}
              onChange={setTheme}
              segments={[
                { value: 'light', label: t('pages.more.preferences.themes.light') },
                { value: 'dark', label: t('pages.more.preferences.themes.dark') },
                { value: 'system', label: t('pages.more.preferences.themes.system') },
              ]}
            />
          </Field>
        </Panel>

        {saveFailed ? (
          <p role="alert" className="mt-3 text-sm text-danger">
            {t('pages.more.preferences.saveFailed')}
          </p>
        ) : null}
      </section>

      <section className="mt-8">
        <SectionHead label={t('pages.more.account.label')} />
        <Panel>
          <Field label={t('pages.more.account.signedInAs')}>
            <p className="break-all">{session?.user.email}</p>
          </Field>
        </Panel>

        {errorKey ? (
          <p role="alert" className="mt-3 text-sm text-danger">
            {t(errorKey)}
          </p>
        ) : null}

        <Button variant="quiet" pending={pending} onClick={signOut} className="mt-4">
          {pending ? t('pages.more.account.signingOut') : t('pages.more.account.signOut')}
        </Button>
      </section>
    </>
  )
}

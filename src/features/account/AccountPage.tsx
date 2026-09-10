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
import { Confirm } from '@/components/ui/confirm'
import { buildExport, download } from '@/features/account/export'
import { authErrorKey, type AuthErrorKey } from '@/features/auth/auth-errors'
import { useSession } from '@/features/auth/useSession'
import { usePreferences } from '@/features/settings/usePreferences'
import type { Locale } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'
import type { ThemePref } from '@/lib/theme'

export default function AccountPage() {
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
      <ScreenTitle>{t('nav.account')}</ScreenTitle>
      <NotBuiltYet label={t('common.notBuiltYet')}>{t('pages.account.planned')}</NotBuiltYet>

      <section className="mt-8">
        <SectionHead label={t('pages.account.tracking.label')} />
        <Rows>
          <Row to="/goals">
            <span className="min-w-0 flex-1 truncate">{t('nav.goals')}</span>
            <span aria-hidden className="shrink-0 font-mono text-2xs text-ink-faint">
              →
            </span>
          </Row>
        </Rows>
      </section>

      <section className="mt-8">
        <SectionHead label={t('pages.account.preferences.label')} />
        {/* Field puts the label above the control, not beside it: `design` plus
            three segments does not sit on one line at 375px (DESIGN.md §9, §10.2). */}
        <Panel>
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
      </section>

      <section className="mt-8">
        <SectionHead label={t('pages.account.account.label')} />
        <Panel>
          <Field label={t('pages.account.account.signedInAs')}>
            <p className="break-all">{session?.user.email}</p>
          </Field>
        </Panel>

        {errorKey ? (
          <p role="alert" className="mt-3 text-sm text-danger">
            {t(errorKey)}
          </p>
        ) : null}

        <Button variant="quiet" pending={pending} onClick={signOut} className="mt-4">
          {pending ? t('pages.account.account.signingOut') : t('pages.account.account.signOut')}
        </Button>
      </section>

      <YourData />

      <section className="mt-8">
        <SectionHead label={t('pages.account.data.legal')} />
        <Rows>
          <Row to="/legal/privacy">
            <span className="min-w-0 flex-1 truncate">{t('pages.account.data.privacy')}</span>
            <span aria-hidden className="shrink-0 font-mono text-2xs text-ink-faint">
              →
            </span>
          </Row>
          <Row to="/legal/imprint">
            <span className="min-w-0 flex-1 truncate">{t('pages.account.data.imprint')}</span>
            <span aria-hidden className="shrink-0 font-mono text-2xs text-ink-faint">
              →
            </span>
          </Row>
        </Rows>
      </section>
    </>
  )
}

/**
 * Articles 15, 17 and 20, as two buttons.
 *
 * They are on the account screen rather than behind a support address because
 * the rights are the user's and a right somebody has to ask for is a right with
 * a gatekeeper. Both act immediately and neither needs anybody to be watching.
 */
function YourData() {
  const { t } = useTranslation()
  const [busy, setBusy] = useState<'export' | 'delete' | null>(null)
  const [failed, setFailed] = useState<'export' | 'delete' | null>(null)
  const [confirming, setConfirming] = useState(false)

  async function exportData() {
    setBusy('export')
    setFailed(null)
    const file = await buildExport()
    setBusy(null)
    if (!file) {
      setFailed('export')
      return
    }
    download(file, `merit-${file.exportedAt.slice(0, 10)}.json`)
  }

  async function deleteAccount() {
    setBusy('delete')
    setFailed(null)
    const { error } = await supabase.rpc('delete_own_account')
    if (error) {
      setBusy(null)
      setFailed('delete')
      return
    }
    // The row is gone; the session in this tab is not. Signing out clears it
    // and RequireAuth sends them to the sign-in screen.
    await supabase.auth.signOut()
  }

  return (
    <section className="mt-8">
      <SectionHead label={t('pages.account.data.label')} />
      <p className="mb-4 max-w-[62ch] text-sm text-ink-muted">{t('pages.account.data.lead')}</p>

      <div className="flex flex-col gap-6">
        <div>
          <Button variant="quiet" pending={busy === 'export'} onClick={() => void exportData()}>
            {busy === 'export' ? t('pages.account.data.exporting') : t('pages.account.data.export')}
          </Button>
          <p className="mt-2 max-w-[62ch] font-mono text-2xs text-ink-faint">
            {t('pages.account.data.exportHint')}
          </p>
          {failed === 'export' ? (
            <p role="alert" className="mt-2 text-sm text-danger">
              {t('pages.account.data.exportFailed')}
            </p>
          ) : null}
        </div>

        <div>
          <Button
            variant="quiet"
            className="text-danger hover:border-danger"
            pending={busy === 'delete'}
            onClick={() => setConfirming(true)}
          >
            {busy === 'delete' ? t('pages.account.data.deleting') : t('pages.account.data.delete')}
          </Button>
          <p className="mt-2 max-w-[62ch] font-mono text-2xs text-ink-faint">
            {t('pages.account.data.deleteHint')}
          </p>
          {failed === 'delete' ? (
            <p role="alert" className="mt-2 text-sm text-danger">
              {t('pages.account.data.deleteFailed')}
            </p>
          ) : null}
        </div>
      </div>

      <Confirm
        open={confirming}
        onOpenChange={(open) => !open && setConfirming(false)}
        question={t('pages.account.data.deleteConfirm')}
        confirmLabel={t('pages.account.data.deleteConfirmLabel')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => void deleteAccount()}
      />
    </section>
  )
}

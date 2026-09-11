import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Row, Rows } from '@/components/Rows'
import { ScreenTitle } from '@/components/ScreenTitle'
import { SectionHead } from '@/components/SectionHead'
import { Button } from '@/components/ui/button'
import { authErrorKey, type AuthErrorKey } from '@/features/auth/auth-errors'
import { supabase } from '@/lib/supabase'

/**
 * The account screen is an index and nothing else.
 *
 * It used to hold six unrelated things on one scroll (goals, language, theme,
 * the signed-in address, export, deletion, legal) separated by panels and by
 * nothing else. Panels group; they do not explain, and a screen you have to
 * scan twice to find the language toggle is a screen with no shape.
 *
 * So each area became a screen of its own and this became the list that points
 * at them (DESIGN.md §10.1). The pattern was already here in the one row that
 * led to the goals; it is now carried through. Sign-out stays on this screen
 * because it belongs to no area and is what somebody comes here to do.
 */
export default function AccountPage() {
  const { t } = useTranslation()
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

      <section className="mt-8">
        <Rows>
          <LinkRow to="/account/profile" label={t('nav.profile')} />
          <LinkRow to="/goals" label={t('nav.goals')} />
          <LinkRow to="/account/appearance" label={t('nav.appearance')} />
          <LinkRow to="/account/data" label={t('nav.data')} />
          {/* The first-run walkthrough, on purpose reachable again: somebody
              who skipped it, whose circumstances changed, or who wants to see
              it a second time (GOAL.md §2.1.1). */}
          <LinkRow to="/welcome" label={t('nav.welcome')} />
        </Rows>
      </section>

      <section className="mt-8">
        <SectionHead label={t('pages.account.data.legal')} />
        <Rows>
          <LinkRow to="/legal/privacy" label={t('pages.account.data.privacy')} />
          <LinkRow to="/legal/imprint" label={t('pages.account.data.imprint')} />
        </Rows>
      </section>

      {errorKey ? (
        <p role="alert" className="mt-8 text-sm text-danger">
          {t(errorKey)}
        </p>
      ) : null}

      <Button variant="quiet" pending={pending} onClick={signOut} className="mt-8">
        {pending ? t('pages.account.account.signingOut') : t('pages.account.account.signOut')}
      </Button>
    </>
  )
}

/** A row that leads somewhere: name on the left, the same mono arrow on the
 *  right every time, so the list reads as one thing rather than six. */
function LinkRow({ to, label }: { to: string; label: string }) {
  return (
    <Row to={to}>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span aria-hidden className="shrink-0 font-mono text-2xs text-ink-faint">
        →
      </span>
    </Row>
  )
}

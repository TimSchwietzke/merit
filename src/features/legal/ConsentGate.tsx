import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/PageHeader'
import { PRIVACY_VERSION } from '@/features/legal/version'
import { useConsent } from '@/features/legal/useConsent'

const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-prose leading-[1.7] text-ink-muted">{children}</p>
)

const Section = ({ heading, children }: { heading: string; children: React.ReactNode }) => (
  <section className="flex flex-col gap-3">
    <h2 className="text-lg font-semibold tracking-tight text-ink">{heading}</h2>
    {children}
  </section>
)

/**
 * Explicit consent, Art. 9(2)(a), before anything else.
 *
 * A screen of its own rather than a checkbox beside a password: "explicit"
 * means a deliberate act about *this*, separable from signing in, and consent
 * bundled into an account creation is not freely given for a separate purpose.
 * There is one button and it says what it agrees to; there is no pre-ticked
 * anything, and no way past it except the button or signing out.
 *
 * It names the categories in the text rather than only linking the notice,
 * because Art. 9 consent has to be informed about the special-category
 * processing specifically. The full notice is one tap away and opens without
 * losing this screen.
 *
 * A material change to the notice bumps its version and everybody lands here
 * again, which is the only way stored consent stays true.
 */
export function ConsentGate() {
  const { t } = useTranslation()
  const { status, give } = useConsent()
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  // Nothing rather than a spinner while it is read: the answer is one row and
  // a spinner that appears and vanishes on every load reads as a fault (§17).
  if (status === 'loading') return null

  // No privacy notice, no consent to ask for. Consent has to be *informed* and
  // there is nothing yet to inform anybody with, so a deployed build closes
  // rather than collecting a signature on a blank page. That is the forcing
  // function which stops merit reaching anybody before its legal pages exist.
  //
  // Only a deployed build. A developer running this locally is not a data
  // subject being asked for anything, and a gate that also blocks the test
  // suite would be removed within the week — which is how forcing functions
  // die. It complains loudly in the console instead.
  if (PRIVACY_VERSION === '') {
    if (import.meta.env.PROD) {
      return (
        <main className="mx-auto w-full max-w-[62ch] px-4 py-16 md:px-6">
          <div className="border-l-2 border-danger py-1 pl-4">
            <p className="font-mono text-2xs text-danger">{t('pages.consent.notReady')}</p>
          </div>
        </main>
      )
    }
    console.warn(
      'merit: no privacy notice in documents.ts, so consent is not being asked for. ' +
        'A production build refuses to run in this state. See docs/LEGAL-INPUTS.md.',
    )
    return <Outlet />
  }

  if (status === 'given') return <Outlet />

  return (
    <main className="mx-auto w-full max-w-[72ch] px-4 py-10 md:px-6">
      <PageHeader title={t('pages.consent.title')} lead={t('pages.consent.lead')} />

      <div className="flex flex-col gap-9">
        <Section heading={t('pages.consent.what')}>
          <P>{t('pages.consent.whatBody')}</P>
        </Section>

        <Section heading={t('pages.consent.why')}>
          <P>{t('pages.consent.whyBody')}</P>
        </Section>

        <Section heading={t('pages.consent.control')}>
          <P>{t('pages.consent.controlBody')}</P>
        </Section>
      </div>

      <p className="mt-9 text-prose font-medium leading-[1.7] text-ink">
        {t('pages.consent.statement')}
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          variant="primary"
          pending={pending}
          onClick={async () => {
            setPending(true)
            setFailed(!(await give()))
            setPending(false)
          }}
        >
          {pending ? t('pages.consent.saving') : t('pages.consent.agree')}
        </Button>
        <Link
          to="/legal/privacy"
          className="inline-flex min-h-11 items-center font-mono text-2xs text-accent underline decoration-1 underline-offset-2"
        >
          {t('pages.consent.read')}
        </Link>
      </div>

      {failed || status === 'error' ? (
        <p role="alert" className="mt-4 text-sm text-danger">
          {t('pages.consent.failed')}
        </p>
      ) : null}

      <p className="mt-9 max-w-[62ch] font-mono text-2xs text-ink-faint">
        {t('pages.consent.decline')}
      </p>
    </main>
  )
}

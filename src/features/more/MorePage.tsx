import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { NotBuiltYet } from '@/components/NotBuiltYet'
import { PageHeader } from '@/components/PageHeader'
import { Panel } from '@/components/Panel'
import { SectionHead } from '@/components/SectionHead'
import { Button } from '@/components/ui/button'
import { authErrorKey, type AuthErrorKey } from '@/features/auth/auth-errors'
import { useSession } from '@/features/auth/useSession'
import { supabase } from '@/lib/supabase'

export default function MorePage() {
  const { t } = useTranslation()
  const { session } = useSession()
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
      <PageHeader title={t('pages.more.title')} />
      <NotBuiltYet label={t('common.notBuiltYet')}>{t('pages.more.planned')}</NotBuiltYet>

      <section className="mt-8">
        <SectionHead label={t('pages.more.account.label')} />
        <Panel>
          <div className="px-4 py-3.5">
            <p className="font-mono text-2xs text-ink-faint">{t('pages.more.account.signedInAs')}</p>
            <p className="mt-2 text-sm break-all">{session?.user.email}</p>
          </div>
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

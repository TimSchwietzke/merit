import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation } from 'react-router-dom'

import { Eyebrow } from '@/components/Eyebrow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authErrorKey, type AuthErrorKey } from '@/features/auth/auth-errors'
import { useSession } from '@/features/auth/useSession'
import { supabase } from '@/lib/supabase'

/**
 * Sign-in, and nothing else. Merit is invite-only for the MVP and accounts are
 * created by hand (GOAL.md §3), so there is no sign-up form, no "create an
 * account" link, and nothing here that hints at one.
 *
 * Rendered outside the AppShell: a signed-out visitor has no tabs to switch to.
 */
export default function SignInPage() {
  const { t } = useTranslation()
  const { status } = useSession()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [errorKey, setErrorKey] = useState<AuthErrorKey | null>(null)

  const from = (location.state as { from?: string } | null)?.from ?? '/'

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setErrorKey(null)

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) {
      setErrorKey(authErrorKey(error))
      setPending(false)
      return
    }
    // On success the session change unmounts this screen. `pending` stays true
    // so the button cannot be tapped again during the swap.
  }

  // Wait for the stored session before deciding, or a reload on a signed-in
  // device flashes this form for a frame.
  if (status === 'loading') return null
  if (status === 'signedIn') return <Navigate to={from} replace />

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[400px] flex-col justify-center px-4 py-10">
      <header className="mb-8">
        <Eyebrow>{t('app.name')}</Eyebrow>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-balance">
          {t('auth.signIn.title')}
        </h1>
        <p className="mt-2 text-ink-muted">{t('auth.signIn.lead')}</p>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">{t('auth.signIn.email')}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password">{t('auth.signIn.password')}</Label>
          <Input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        {errorKey ? (
          <p role="alert" className="text-sm text-danger">
            {t(errorKey)}
          </p>
        ) : null}

        <Button type="submit" variant="primary" pending={pending} className="w-full">
          {pending ? t('auth.signIn.pending') : t('auth.signIn.submit')}
        </Button>
      </form>
    </main>
  )
}

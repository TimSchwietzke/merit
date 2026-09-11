import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { Field } from '@/components/Field'
import { Panel } from '@/components/Panel'
import { ScreenTitle } from '@/components/ScreenTitle'
import { SectionHead } from '@/components/SectionHead'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authErrorKey } from '@/features/auth/auth-errors'
import { useSession } from '@/features/auth/useSession'
import { passwordProblem } from '@/lib/password'
import { supabase } from '@/lib/supabase'

/**
 * Name, address, password: the three things about the account itself.
 *
 * Three forms rather than one, because they fail and succeed independently and
 * they are not equally reversible: a name is a typo away from being fixed, an
 * address change waits on an email, a password change ends every guess anybody
 * had. One submit button over all three would hide that.
 */
export default function ProfilePage() {
  const { t } = useTranslation()

  return (
    <>
      <ScreenTitle>{t('nav.profile')}</ScreenTitle>
      <DisplayName />
      <EmailAddress />
      <Password />
    </>
  )
}

/** A small form's state: idle, working, or finished one way or the other. */
type Outcome = { kind: 'done'; message: string } | { kind: 'failed'; message: string } | null

function Notice({ outcome }: { outcome: Outcome }) {
  if (!outcome) return null
  return (
    <p
      role={outcome.kind === 'failed' ? 'alert' : 'status'}
      className={`mt-3 text-sm ${outcome.kind === 'failed' ? 'text-danger' : 'text-ink-muted'}`}
    >
      {outcome.message}
    </p>
  )
}

function DisplayName() {
  const { t } = useTranslation()
  const { session } = useSession()
  const userId = session?.user.id

  const [name, setName] = useState('')
  const [pending, setPending] = useState(false)
  const [outcome, setOutcome] = useState<Outcome>(null)

  useEffect(() => {
    if (!userId) return
    let active = true

    void supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', userId)
      .single()
      .then(({ data }) => {
        if (active && data?.display_name) setName(data.display_name)
      })

    return () => {
      active = false
    }
  }, [userId])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!userId) return
    setPending(true)
    setOutcome(null)

    // Empty clears the name rather than writing "", so the column keeps meaning
    // "not set" one way only.
    const trimmed = name.trim()
    const { data, error } = await supabase
      .from('profiles')
      .update({ display_name: trimmed === '' ? null : trimmed })
      .eq('user_id', userId)
      .select('user_id')

    setPending(false)
    setOutcome(
      error || data?.length === 0
        ? { kind: 'failed', message: t('pages.account.profile.name.failed') }
        : { kind: 'done', message: t('pages.account.profile.name.saved') },
    )
  }

  return (
    <section className="mt-8">
      <SectionHead label={t('pages.account.profile.name.label')} />
      <form onSubmit={onSubmit} className="flex flex-col gap-2" noValidate>
        <Label htmlFor="display-name">{t('pages.account.profile.name.field')}</Label>
        <Input
          id="display-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('pages.account.profile.name.placeholder')}
          autoComplete="name"
          maxLength={80}
        />
        <Button type="submit" variant="quiet" pending={pending} className="mt-2 self-start">
          {pending ? t('pages.account.profile.name.saving') : t('pages.account.profile.name.save')}
        </Button>
      </form>
      <Notice outcome={outcome} />
    </section>
  )
}

function EmailAddress() {
  const { t } = useTranslation()
  const { session } = useSession()
  const current = session?.user.email ?? ''

  const [next, setNext] = useState('')
  const [pending, setPending] = useState(false)
  const [outcome, setOutcome] = useState<Outcome>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const address = next.trim()
    if (address === '') return

    if (address.toLowerCase() === current.toLowerCase()) {
      setOutcome({ kind: 'failed', message: t('pages.account.profile.email.unchanged') })
      return
    }

    setPending(true)
    setOutcome(null)

    // Supabase sends a confirmation to both addresses and leaves the session on
    // the old one until the link is opened. Nothing here changes yet, so the
    // field keeps what was typed and the notice says what is pending.
    const { error } = await supabase.auth.updateUser({ email: address })

    setPending(false)
    setOutcome(
      error
        ? {
            kind: 'failed',
            message:
              authErrorKey(error) === 'auth.errors.rateLimited'
                ? t('auth.errors.rateLimited')
                : t('pages.account.profile.email.failed'),
          }
        : { kind: 'done', message: t('pages.account.profile.email.sent') },
    )
  }

  return (
    <section className="mt-8">
      <SectionHead label={t('pages.account.profile.email.label')} />
      <Panel className="mb-5">
        <Field label={t('pages.account.profile.email.current')}>
          <p className="break-all">{current}</p>
        </Field>
      </Panel>

      <form onSubmit={onSubmit} className="flex flex-col gap-2" noValidate>
        <Label htmlFor="new-email">{t('pages.account.profile.email.field')}</Label>
        <Input
          id="new-email"
          type="email"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <Button type="submit" variant="quiet" pending={pending} className="mt-2 self-start">
          {pending
            ? t('pages.account.profile.email.saving')
            : t('pages.account.profile.email.save')}
        </Button>
      </form>
      <Notice outcome={outcome} />
    </section>
  )
}

function Password() {
  const { t } = useTranslation()
  const { session } = useSession()
  const email = session?.user.email ?? ''

  const [currentPassword, setCurrentPassword] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [pending, setPending] = useState(false)
  const [outcome, setOutcome] = useState<Outcome>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const problem = passwordProblem(next, repeat)
    if (problem) {
      setOutcome({ kind: 'failed', message: t(`pages.account.profile.password.${problem}`) })
      return
    }

    setPending(true)
    setOutcome(null)

    // Supabase changes a password on the strength of the session alone. A
    // borrowed unlocked phone is exactly that, so the current password is
    // checked first, as a sign-in with the same credentials, which either
    // succeeds and refreshes the session we already hold, or proves the person
    // typing is not the one who set it.
    const { error: wrongCurrent } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    })
    if (wrongCurrent) {
      setPending(false)
      setOutcome({ kind: 'failed', message: t('pages.account.profile.password.wrongCurrent') })
      return
    }

    const { error } = await supabase.auth.updateUser({ password: next })
    setPending(false)

    if (error) {
      setOutcome({ kind: 'failed', message: t('pages.account.profile.password.failed') })
      return
    }

    setCurrentPassword('')
    setNext('')
    setRepeat('')
    setOutcome({ kind: 'done', message: t('pages.account.profile.password.saved') })
  }

  return (
    <section className="mt-8">
      <SectionHead label={t('pages.account.profile.password.label')} />
      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor="current-password">{t('pages.account.profile.password.current')}</Label>
          <Input
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="new-password">{t('pages.account.profile.password.field')}</Label>
          <Input
            id="new-password"
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="repeat-password">{t('pages.account.profile.password.repeat')}</Label>
          <Input
            id="repeat-password"
            type="password"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        <Button type="submit" variant="quiet" pending={pending} className="self-start">
          {pending
            ? t('pages.account.profile.password.saving')
            : t('pages.account.profile.password.save')}
        </Button>
      </form>
      <Notice outcome={outcome} />
    </section>
  )
}

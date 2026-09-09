import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'

import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Panel } from '@/components/Panel'
import { Row, Rows } from '@/components/Rows'
import { SectionHead } from '@/components/SectionHead'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { usePlanPause } from '@/features/routines/usePlanPause'
import { useRoutines } from '@/features/routines/useRoutines'
import { todayKey } from '@/lib/date'
import { weekdayLabel } from '@/lib/format'

/**
 * The training days a session can be started from (GOAL.md §5).
 *
 * A day names itself, says how many exercises it holds and which weekdays it is
 * planned for. That is the whole list: what a routine *contains* belongs on its
 * own screen, not squeezed into a 52px row.
 */
export default function RoutinesPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const navigate = useNavigate()
  const { routines, status, create } = useRoutines()
  const { pausedUntil, setPausedUntil } = usePlanPause()

  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (name.trim() === '') {
      setError(t('pages.routines.nameInvalid'))
      return
    }
    setError(null)
    setPending(true)
    const id = await create(name)
    setPending(false)
    if (!id) {
      setError(t('pages.routines.createFailed'))
      return
    }
    // Straight into the editor: a day with no exercises is not a day yet.
    navigate(`/training/routines/${id}`)
  }

  return (
    <>
      <PageHeader title={t('pages.routines.title')} lead={t('pages.routines.lead')} />

      <section>
        <SectionHead label={t('pages.routines.label')} />
        {status === 'error' ? (
          <p role="alert" className="text-sm text-danger">
            {t('pages.routines.loadFailed')}
          </p>
        ) : status === 'loading' ? (
          <p className="font-mono text-2xs text-ink-faint">{t('common.loading')}</p>
        ) : routines.length === 0 ? (
          <EmptyState>{t('pages.routines.empty')}</EmptyState>
        ) : (
          <Rows>
            {routines.map((routine) => (
              <Row key={routine.id} to={`/training/routines/${routine.id}`}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{routine.name}</span>
                  <span className="block truncate font-mono text-2xs text-ink-faint">
                    {t('pages.routines.exerciseCount', { count: routine.exercises.length })}
                    {routine.weekdays.length > 0
                      ? ` · ${routine.weekdays.map((day) => weekdayLabel(day, locale)).join(' ')}`
                      : ` · ${t('pages.routines.noWeekday')}`}
                  </span>
                </span>
                <span aria-hidden className="shrink-0 font-mono text-2xs text-ink-faint">
                  →
                </span>
              </Row>
            ))}
          </Rows>
        )}
      </section>

      <section className="mt-8">
        <form onSubmit={submit} noValidate>
          <Panel className="flex flex-col gap-4 p-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="routine-name">{t('pages.routines.newName')}</Label>
              <Input
                id="routine-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t('pages.routines.newPlaceholder')}
                aria-invalid={error ? true : undefined}
              />
            </div>
            {error ? (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            ) : null}
            <Button type="submit" variant="primary" pending={pending}>
              {pending ? t('pages.routines.creating') : t('pages.routines.create')}
            </Button>
          </Panel>
        </form>
      </section>

      <section className="mt-8">
        <SectionHead label={t('pages.routines.pauseLabel')} />
        <Panel className="flex flex-col gap-3 p-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="plan-pause">
              {t('pages.routines.pauseUntil')}
              <span className="text-ink-faint">{t('pages.routines.pauseHint')}</span>
            </Label>
            <Input
              id="plan-pause"
              type="date"
              min={todayKey()}
              value={pausedUntil ?? ''}
              onChange={(event) => void setPausedUntil(event.target.value || null)}
              className="font-mono [&::-webkit-calendar-picker-indicator]:opacity-60 dark:[&::-webkit-calendar-picker-indicator]:invert"
            />
          </div>
          {pausedUntil ? (
            <Button variant="quiet" onClick={() => void setPausedUntil(null)}>
              {t('pages.routines.pauseClear')}
            </Button>
          ) : null}
        </Panel>
      </section>

      <Link
        to="/training"
        className="mt-8 inline-flex min-h-11 items-center font-mono text-2xs text-accent underline decoration-1 underline-offset-2"
      >
        ← {t('pages.routines.back')}
      </Link>
    </>
  )
}

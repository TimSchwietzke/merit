import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowUpDown } from 'lucide-react'

import { ScreenTitle } from '@/components/ScreenTitle'
import { SectionHead } from '@/components/SectionHead'
import { Button } from '@/components/ui/button'
import { Confirm } from '@/components/ui/confirm'
import { useSchedule, type DaySession, type ScheduleDay } from '@/features/training/useSchedule'
import { todayKey } from '@/lib/date'
import { formatDayShort, weekdayLabel } from '@/lib/format'
import { isPast, swap, weekOf } from '@/lib/schedule'
import { isoWeekday } from '@/lib/training'

/**
 * The week (GOAL.md §5, §6): what is on each day, what has been done, and the
 * way into today's session.
 *
 * Moving a session is a visible mode rather than two taps the screen says
 * nothing about. Tapping the arrow marks that session, the eligible days become
 * targets and the days that have already happened grey out, and a line at the
 * top says what to do next. Tapping the marked one again cancels.
 */
export default function WeekPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const navigate = useNavigate()

  const today = todayKey()
  const week = weekOf(today)
  const { days, routines, overrides, status, apply } = useSchedule(week[0], week[6])

  const [moving, setMoving] = useState<{ routineId: string; date: string; name: string } | null>(null)
  const [pending, setPending] = useState<
    { a: { routineId: string; date: string; name: string }; b: { routineId: string; date: string; name: string } } | null
  >(null)

  function onArrow(date: string, session: DaySession) {
    const mine = { routineId: session.routine.id, date, name: session.routine.name }
    if (!moving) return setMoving(mine)
    if (moving.date === date && moving.routineId === session.routine.id) return setMoving(null)
    setPending({ a: moving, b: mine })
    setMoving(null)
  }

  return (
    <>
      <ScreenTitle>{t('nav.training')}</ScreenTitle>

      {status === 'ready' ? (
        <NextSession days={days} routines={routines} today={today} locale={locale} />
      ) : null}

      <section className="mt-6">
        <SectionHead
          label={t('pages.training.week.label')}
          hint={
            // `inline-flex min-h-11` per §5.2: the hit area reaches 44px, the
            // text and its underline stay where they were.
            <Link
              to="/training/routines"
              className="-my-3 inline-flex min-h-11 items-center text-accent underline decoration-1 underline-offset-2"
            >
              {t('pages.training.week.manage')}
            </Link>
          }
        />

        {moving ? (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-md border border-accent bg-accent-soft px-3 py-2">
            <p className="min-w-0 font-mono text-2xs text-accent">
              {t('pages.training.week.swapping', { name: moving.name })}
            </p>
            <Button variant="bare" size="small" onClick={() => setMoving(null)}>
              {t('pages.training.week.swapCancel')}
            </Button>
          </div>
        ) : null}

        {status === 'error' ? (
          <p role="alert" className="text-sm text-danger">
            {t('pages.training.week.loadFailed')}
          </p>
        ) : status === 'loading' ? (
          <p className="font-mono text-2xs text-ink-faint">{t('common.loading')}</p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {days.map((day) => (
              <li key={day.date} className={day.date === today ? 'bg-surface-2' : undefined}>
                <div className="flex items-baseline gap-3 px-4 pt-3">
                  <span
                    className={`w-8 shrink-0 font-mono text-2xs ${
                      day.date === today ? 'text-accent' : 'text-ink-faint'
                    }`}
                  >
                    {weekdayLabel(isoWeekday(day.date), locale)}
                  </span>
                  <span className="min-w-0 flex-1 font-mono text-2xs text-ink-faint">
                    {formatDayShort(day.date, locale)}
                  </span>
                </div>

                {day.sessions.length === 0 ? (
                  <p className="px-4 pb-3 pl-15 text-sm text-ink-faint">
                    {t('pages.training.week.rest')}
                  </p>
                ) : (
                  day.sessions.map((session) => (
                    <div key={session.routine.id} className="flex items-center gap-2 px-4 pb-3">
                      <span className="w-8 shrink-0" aria-hidden />
                      <button
                        type="button"
                        onClick={() =>
                          moving
                            ? onArrow(day.date, session)
                            : navigate(`/training/session?date=${day.date}&routine=${session.routine.id}`)
                        }
                        className="min-w-0 flex-1 py-1 text-left"
                      >
                        <span className="block truncate text-sm text-ink">{session.routine.name}</span>
                        <span className="block truncate font-mono text-2xs text-ink-faint">
                          {session.loggedSets > 0
                            ? t('pages.training.week.done', {
                                logged: session.loggedSets,
                                total: session.totalSets,
                              })
                            : t('pages.training.week.open')}
                        </span>
                      </button>

                      {/* Vertical arrows: the days are a column, so the axis of
                          the icon matches the axis of the move — and it does not
                          read as "exchange this for a different thing", which is
                          a separate operation living in the session preview. */}
                      <Button
                        variant="bare"
                        size="icon"
                        aria-label={t('pages.training.week.swap')}
                        aria-pressed={moving?.date === day.date && moving?.routineId === session.routine.id}
                        disabled={isPast(day.date, today)}
                        onClick={() => onArrow(day.date, session)}
                        className={
                          moving?.date === day.date && moving?.routineId === session.routine.id
                            ? 'text-accent'
                            : undefined
                        }
                      >
                        <ArrowUpDown />
                      </Button>
                    </div>
                  ))
                )}
              </li>
            ))}
          </ul>
        )}
      </section>


      <Confirm
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        question={
          pending
            ? t('pages.training.week.swapConfirm', {
                a: pending.a.name,
                aDay: formatDayShort(pending.a.date, locale),
                b: pending.b.name,
                bDay: formatDayShort(pending.b.date, locale),
              })
            : ''
        }
        confirmLabel={t('pages.training.week.confirm')}
        cancelLabel={t('pages.training.week.swapCancel')}
        onConfirm={() => {
          if (pending) void apply(swap(overrides, pending.a, pending.b))
        }}
      />
    </>
  )
}

/**
 * The one thing this screen exists to answer: what is next, and when.
 *
 * It is the way in as well as the answer — the card is the link to the preview,
 * so there is no button under the week competing with it. A free session is
 * rare enough not to earn a slab of its own: it is a planned day with its
 * exercises changed, which the preview already does.
 */
function NextSession({
  days,
  routines,
  today,
  locale,
}: {
  days: ScheduleDay[]
  routines: { id: string; name: string }[]
  today: string
  locale: string
}) {
  const { t } = useTranslation()

  // Today first, then forward through the week.
  const upcoming = days.filter((day) => day.date >= today && day.sessions.length > 0)
  const next = upcoming[0]
  const session = next?.sessions[0]

  if (routines.length === 0) {
    return (
      <Link
        to="/training/routines"
        className="block rounded-lg border border-accent bg-accent-soft px-4 py-5"
      >
        <p className="font-mono text-2xs text-accent">{t('pages.training.week.nextLabel')}</p>
        <p className="mt-2 max-w-[40ch] text-ink">{t('pages.training.week.none')}</p>
        <p className="mt-3 font-mono text-2xs text-accent">
          {t('pages.training.week.make')} →
        </p>
      </Link>
    )
  }

  if (!next || !session) {
    return (
      <div className="rounded-lg border border-line bg-surface px-4 py-5">
        <p className="font-mono text-2xs text-ink-faint">{t('pages.training.week.nextLabel')}</p>
        <p className="mt-2 text-ink">{t('pages.training.week.nowhere')}</p>
      </div>
    )
  }

  const isToday = next.date === today
  const done = session.loggedSets > 0

  return (
    <Link
      to={`/training/session?date=${next.date}&routine=${session.routine.id}`}
      className="block rounded-lg border border-accent bg-accent-soft px-4 py-5
                 transition-colors [transition-duration:140ms] active:bg-accent-soft/70"
    >
      <p className="font-mono text-2xs text-accent">
        {isToday
          ? t('pages.training.week.todayLabel')
          : `${weekdayLabel(isoWeekday(next.date), locale)} · ${formatDayShort(next.date, locale)}`}
      </p>

      <p className="mt-2 text-xl font-semibold tracking-tight text-ink">{session.routine.name}</p>

      <p className="mt-1 font-mono text-2xs text-ink-muted">
        {session.totalSets === 0
          ? t('pages.training.week.open')
          : done
            ? t('pages.training.week.progress', {
                logged: session.loggedSets,
                total: session.totalSets,
              })
            : t('pages.training.week.setCount', { count: session.totalSets })}
      </p>
    </Link>
  )
}

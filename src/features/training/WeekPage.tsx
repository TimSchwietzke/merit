import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowUpDown } from 'lucide-react'

import { Row, Rows } from '@/components/Rows'
import { ScreenTitle } from '@/components/ScreenTitle'
import { Statement } from '@/components/Statement'
import { Sheet } from '@/components/ui/sheet'
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
  const dueToday = days.find((day) => day.date === today)?.sessions[0] ?? null

  const [pickOpen, setPickOpen] = useState(false)
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

      {status === 'ready' ? <Today days={days} today={today} /> : null}

      <section className="mt-6">
        <SectionHead label={t('pages.training.week.label')} />

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

      {/* One way in. A session due today starts by name; on any other day the
          same button asks which one — there is no reason a rest day should be
          a dead end, and no separate "free session" for it to be a dead end
          next to. */}
      <div className="mt-6 flex flex-col gap-3 md:flex-row">
        {routines.length === 0 ? (
          <Button asChild variant="primary">
            <Link to="/training/routines">{t('pages.training.week.make')}</Link>
          </Button>
        ) : (
          <Button variant="primary" onClick={() => setPickOpen(true)}>
            {dueToday
              ? t('pages.training.week.startToday', { name: dueToday.routine.name })
              : t('pages.training.week.startAnything')}
          </Button>
        )}
        <Button asChild variant="quiet">
          <Link to="/training/routines">{t('pages.training.week.manage')}</Link>
        </Button>
      </div>

      <Sheet
        open={pickOpen}
        onOpenChange={setPickOpen}
        title={t('pages.training.week.pick')}
        closeLabel={t('common.close')}
      >
        <Rows>
          {routines.map((routine) => (
            <Row
              key={routine.id}
              onClick={() => navigate(`/training/session?date=${today}&routine=${routine.id}`)}
            >
              <span className="min-w-0 flex-1 truncate">{routine.name}</span>
              {routine.weekdays.length > 0 ? (
                <span className="shrink-0 font-mono text-2xs text-ink-faint">
                  {routine.weekdays.map((day) => weekdayLabel(day, locale)).join(' ')}
                </span>
              ) : null}
            </Row>
          ))}
        </Rows>
      </Sheet>

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
 * What today is, in one sentence, before the grid rather than left to be read
 * out of it. GOAL.md §6 asks the dashboard for exactly this; the training tab
 * is the other place somebody looks for it.
 */
function Today({ days, today }: { days: ScheduleDay[]; today: string }) {
  const { t } = useTranslation()
  const sessions = days.find((day) => day.date === today)?.sessions ?? []
  const done = sessions.find((session) => session.loggedSets > 0)

  return (
    <Statement>
      {done
        ? t('pages.training.week.doneToday', { name: done.routine.name })
        : sessions.length > 0
          ? t('pages.training.week.dueToday', { name: sessions[0].routine.name })
          : t('pages.training.week.restToday')}
    </Statement>
  )
}

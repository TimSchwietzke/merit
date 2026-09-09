import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowUpDown, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { EmptyState } from '@/components/EmptyState'
import { Panel } from '@/components/Panel'
import { Row, Rows } from '@/components/Rows'
import { ScreenTitle } from '@/components/ScreenTitle'
import { SectionHead } from '@/components/SectionHead'
import { Button } from '@/components/ui/button'
import { Confirm } from '@/components/ui/confirm'
import { Sheet } from '@/components/ui/sheet'
import { plannable, useRoutines, type Routine } from '@/features/routines/useRoutines'
import { useActiveSession } from '@/features/training/useActiveSession'
import { useSchedule, type DaySession, type ScheduleDay } from '@/features/training/useSchedule'
import { addDays, todayKey } from '@/lib/date'
import { formatDayLong, formatDayRange, formatDayShort, weekdayLabel } from '@/lib/format'
import { addTo, isPast, swap, weekOf } from '@/lib/schedule'
import { isoWeekday } from '@/lib/training'

/**
 * Training (GOAL.md §5, §6): the week, the day you are looking at, and the
 * routines both are made of — one screen, in that order.
 *
 * The week is a strip of seven tiles rather than a seven-item list, which is
 * how every calendar on the phone this runs on behaves and how the Fitness app
 * puts a week above a day's detail. It costs one line of screen instead of
 * eight, so the day below it gets the room, and moving between days changes
 * that block in place rather than pushing a new screen.
 *
 * Each tile carries the mosaic mark from §10.10 — the same three states told
 * apart by fill density rather than hue, so a week reads at a glance without
 * anyone having to learn a colour key: `line` for a rest day, half-strength
 * accent for a session that is planned, full accent for one that has been
 * started.
 */
export default function WeekPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const navigate = useNavigate()

  const today = todayKey()
  const [selected, setSelected] = useState(today)
  const week = useMemo(() => weekOf(selected), [selected])

  const { routines, status: routinesStatus, create } = useRoutines()
  const planned = useMemo(() => plannable(routines), [routines])
  const { days, overrides, status, apply } = useSchedule(week[0], week[6], planned)

  const [moving, setMoving] = useState<Marked | null>(null)
  const [pending, setPending] = useState<{ a: Marked; b: Marked } | null>(null)

  const day = days.find((entry) => entry.date === selected)

  function onMove(date: string, session: DaySession) {
    const mine = { routineId: session.routine.id, date, name: session.routine.name }
    if (!moving) return setMoving(mine)
    if (moving.date === date && moving.routineId === session.routine.id) return setMoving(null)
    setPending({ a: moving, b: mine })
    setMoving(null)
  }

  return (
    <>
      <ScreenTitle>{t('nav.training')}</ScreenTitle>

      <WeekStrip
        days={days}
        week={week}
        today={today}
        selected={selected}
        locale={locale}
        onSelect={setSelected}
        onShift={(by) => setSelected(addDays(selected, by * 7))}
      />

      {moving ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-accent bg-accent-soft px-3 py-2">
          <p className="min-w-0 font-mono text-2xs text-accent">
            {t('pages.training.week.moving', { name: moving.name })}
          </p>
          <Button variant="bare" size="small" onClick={() => setMoving(null)}>
            {t('pages.training.week.moveCancel')}
          </Button>
        </div>
      ) : null}

      {status === 'error' ? (
        <p role="alert" className="mt-4 text-sm text-danger">
          {t('pages.training.week.loadFailed')}
        </p>
      ) : (
        <DayCard
          day={day}
          today={today}
          locale={locale}
          routines={planned}
          marked={moving}
          onMove={onMove}
          onPut={(routineId) => apply(addTo(overrides, routineId, selected))}
        />
      )}

      <RoutineList routines={routines} status={routinesStatus} locale={locale} />

      <AddRoutine
        onAdd={async () => {
          const id = await create(t('pages.routines.defaultName'))
          if (!id) {
            toast(t('pages.routines.createFailed'))
            return
          }
          // `new`: the editor puts the cursor in the name field, because the
          // name is the one thing a routine created this way does not have yet.
          navigate(`/training/routines/${id}?new=1`)
        }}
      />

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
        cancelLabel={t('pages.training.week.moveCancel')}
        onConfirm={() => {
          if (pending) void apply(swap(overrides, pending.a, pending.b))
        }}
      />
    </>
  )
}

interface Marked {
  routineId: string
  date: string
  name: string
}

/**
 * What a day's tile says about it, by fill density rather than by hue (§10.10).
 *
 * A rest day carries nothing rather than a `line` dash. The heatmap needs its
 * empty state drawn because a grid with holes in it stops being a grid; a week
 * of seven does not, and a row of faint grey marks with two green ones in it
 * reads as five things you have not done.
 */
function markOf(day: ScheduleDay | undefined): string {
  if (!day || day.sessions.length === 0) return 'bg-transparent'
  return day.sessions.some((session) => session.loggedSets > 0) ? 'bg-accent' : 'bg-accent/55'
}

function WeekStrip({
  days,
  week,
  today,
  selected,
  locale,
  onSelect,
  onShift,
}: {
  days: ScheduleDay[]
  week: string[]
  today: string
  selected: string
  locale: string
  onSelect: (date: string) => void
  onShift: (by: -1 | 1) => void
}) {
  const { t } = useTranslation()

  const range = formatDayRange(week[0], week[6], locale)

  return (
    <Panel className="p-2">
      <div className="flex items-center justify-between gap-2">
        <Button variant="bare" size="icon" aria-label={t('pages.training.week.prev')} onClick={() => onShift(-1)}>
          <ChevronLeft />
        </Button>
        <p className="font-mono text-2xs text-ink-faint">{range}</p>
        <Button variant="bare" size="icon" aria-label={t('pages.training.week.next')} onClick={() => onShift(1)}>
          <ChevronRight />
        </Button>
      </div>

      {/* A radio group, not seven buttons: exactly one day is being looked at,
          and arrow keys should walk the week (§10.7). */}
      {/* Pulled 4px past the panel's padding and down to the mosaic's own 2px
          gap: seven tiles inside 375px came out 43px wide, and §5.2's floor is
          44. */}
      <div
        role="radiogroup"
        aria-label={t('pages.training.week.label')}
        className="-mx-1 mt-1 flex gap-0.5"
      >
        {week.map((date) => {
          const day = days.find((entry) => entry.date === date)
          const isSelected = date === selected
          const isToday = date === today

          return (
            <button
              key={date}
              type="button"
              role="radio"
              aria-checked={isSelected}
              // The visible text is `Mo` above `07`, which a screen reader
              // reads as "Mo07". The date is said properly instead.
              aria-label={formatDayLong(date, locale)}
              onClick={() => onSelect(date)}
              className={`flex min-h-11 flex-1 flex-col items-center gap-1 rounded-md border px-1 pb-2 pt-1.5
                          transition-colors [transition-duration:140ms] active:[transition-duration:0ms]
                          ${
                            isSelected
                              ? 'border-accent bg-accent-soft'
                              : isToday
                                ? 'border-line-strong active:bg-surface-2'
                                : 'border-transparent active:bg-surface-2'
                          }`}
            >
              <span
                className={`font-mono text-2xs ${
                  isToday ? 'text-accent' : isSelected ? 'text-ink-muted' : 'text-ink-faint'
                }`}
              >
                {weekdayLabel(isoWeekday(date), locale)}
              </span>
              <span
                className={`font-mono text-sm tabular-nums ${
                  isSelected ? 'font-medium text-ink' : 'text-ink-muted'
                }`}
              >
                {date.slice(8)}
              </span>
              {/* The mosaic cell from the house style, one per day. */}
              {/* Fixed width, not the tile's: on a desktop column the tile is
                  100px wide and a mark that fills it stops being a mark and
                  becomes an underline. */}
              <span aria-hidden className={`h-1 w-6 rounded-sm ${markOf(day)}`} />
            </button>
          )
        })}
      </div>
    </Panel>
  )
}

/**
 * The selected day: what is on it, and the way into it.
 *
 * The card is the link — there is no button under it repeating what tapping the
 * name already does. Everything a day can be is one of three shapes: it holds
 * sessions, it is empty, or it has not loaded.
 */
function DayCard({
  day,
  today,
  locale,
  routines,
  marked,
  onMove,
  onPut,
}: {
  day: ScheduleDay | undefined
  today: string
  locale: string
  routines: { id: string; name: string }[]
  marked: Marked | null
  onMove: (date: string, session: DaySession) => void
  onPut: (routineId: string) => Promise<boolean>
}) {
  const { t } = useTranslation()
  const [picking, setPicking] = useState(false)
  const [failed, setFailed] = useState(false)

  if (!day) {
    return <p className="mt-4 font-mono text-2xs text-ink-faint">{t('common.loading')}</p>
  }

  const eyebrow =
    day.date === today
      ? t('pages.training.week.today')
      : `${weekdayLabel(isoWeekday(day.date), locale)} · ${formatDayShort(day.date, locale)}`

  return (
    <>
      <Panel className="mt-3 px-4 py-3">
        <div className="flex min-h-11 items-center justify-between gap-3">
          <p
            className={`font-mono text-2xs ${day.date === today ? 'text-accent' : 'text-ink-faint'}`}
          >
            {eyebrow}
          </p>
          {day.sessions.length > 0 && !isPast(day.date, today) ? (
            <Button
              variant="bare"
              size="icon"
              aria-label={t('pages.training.week.move')}
              aria-pressed={marked?.date === day.date}
              onClick={() => onMove(day.date, day.sessions[0])}
              className={marked?.date === day.date ? '-mr-2 text-accent' : '-mr-2'}
            >
              <ArrowUpDown />
            </Button>
          ) : null}
        </div>

        {day.sessions.length === 0 ? (
          <>
            <p className="text-ink-muted">{t('pages.training.week.nothing')}</p>
            {routines.length > 0 ? (
              <Button variant="quiet" className="mt-3 w-full md:w-auto" onClick={() => setPicking(true)}>
                {t('pages.training.week.put')}
              </Button>
            ) : null}
            {failed ? (
              <p role="alert" className="mt-3 text-sm text-danger">
                {t('pages.training.week.putFailed')}
              </p>
            ) : null}
          </>
        ) : (
          day.sessions.map((session) => (
            <Link
              key={session.routine.id}
              to={`/training/session?date=${day.date}&routine=${session.routine.id}`}
              className="-mx-4 flex items-center gap-3 px-4 py-2 transition-colors
                         [transition-duration:140ms] hover:bg-surface-2 active:bg-surface-2
                         active:[transition-duration:0ms]"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xl font-semibold tracking-tight text-ink">
                  {session.routine.name}
                </span>
                <span className="mt-0.5 block truncate font-mono text-2xs text-ink-muted">
                  {session.totalSets === 0
                    ? t('pages.training.week.open')
                    : session.loggedSets > 0
                      ? t('pages.training.week.progress', {
                          logged: session.loggedSets,
                          total: session.totalSets,
                        })
                      : t('pages.training.week.setCount', { count: session.totalSets })}
                </span>
              </span>
              <span aria-hidden className="shrink-0 font-mono text-2xs text-ink-faint">
                →
              </span>
            </Link>
          ))
        )}
      </Panel>

      <Sheet
        open={picking}
        onOpenChange={setPicking}
        title={t('pages.training.week.putTitle')}
        closeLabel={t('common.close')}
      >
        <Rows>
          {routines.map((routine) => (
            <Row
              key={routine.id}
              onClick={() => {
                setPicking(false)
                void onPut(routine.id).then((ok) => setFailed(!ok))
              }}
            >
              <span className="min-w-0 flex-1 truncate">{routine.name}</span>
            </Row>
          ))}
        </Rows>
      </Sheet>
    </>
  )
}

/**
 * The routines, on the screen they are used from.
 *
 * They were behind a link for one release and that was one release too many: a
 * routine is the thing this feature is made of, and the week above is only a
 * projection of it.
 *
 * The bottom padding is for the button floating over this list — a fixed
 * element takes no space in the flow and would otherwise sit on the last row.
 */
function RoutineList({
  routines,
  status,
  locale,
}: {
  routines: Routine[]
  status: 'loading' | 'ready' | 'error'
  locale: string
}) {
  const { t } = useTranslation()

  return (
    <section className="mt-8 pb-16">
      <SectionHead
        label={t('pages.routines.label')}
        hint={status === 'ready' ? String(routines.length) : undefined}
      />

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
                  {routine.exercises.length === 0
                    ? t('pages.routines.unfinished')
                    : `${t('pages.routines.exerciseCount', { count: routine.exercises.length })} · ${
                        routine.weekdays.length > 0
                          ? routine.weekdays.map((day) => weekdayLabel(day, locale)).join(' ')
                          : t('pages.routines.noWeekday')
                      }`}
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
  )
}

/**
 * Adding a routine, floating over the screen it belongs to.
 *
 * A name field and a button at the bottom of the page put the least-used
 * control on the screen in permanent view and made you scroll past the list to
 * reach it. This is one target in the corner the thumb is already at, and the
 * name is asked for once, in the editor it lands in, rather than twice.
 *
 * It is hidden while a session is running: the set you are on owns the bottom
 * of the screen then, and two floating things fighting for that corner is how
 * the wrong one gets tapped between sets.
 *
 * Square with a 5px radius, not a circle — §6 allows a pill for a progress
 * track and a sheet's drag handle, and nothing else. §6 does allow the shadow:
 * this genuinely floats, which is the same licence the session bar has.
 */
function AddRoutine({ onAdd }: { onAdd: () => Promise<void> }) {
  const { t } = useTranslation()
  const { running } = useActiveSession()
  const [pending, setPending] = useState(false)

  if (running) return null

  return (
    <button
      type="button"
      aria-label={t('pages.routines.create')}
      disabled={pending}
      onClick={async () => {
        setPending(true)
        await onAdd()
        setPending(false)
      }}
      className="fixed bottom-[calc(56px+0.75rem+env(safe-area-inset-bottom))] right-4 z-30 flex
                 h-14 w-14 items-center justify-center rounded-md bg-accent text-bg shadow-lg
                 transition-opacity [transition-duration:140ms] hover:opacity-90
                 active:opacity-90 active:[transition-duration:0ms] disabled:opacity-35
                 lg:bottom-4"
    >
      <Plus size={22} strokeWidth={2} aria-hidden />
    </button>
  )
}

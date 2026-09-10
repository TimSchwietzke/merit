import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowUpDown, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { EmptyState } from '@/components/EmptyState'
import { Progress } from '@/components/Progress'
import { Row, RowBody, Rows } from '@/components/Rows'
import { Loading, RowsSkeleton, Skeleton, StripSkeleton } from '@/components/Skeleton'
import { SwipeRow } from '@/components/SwipeRow'
import { WeekStrip } from '@/components/WeekStrip'
import { ScreenTitle } from '@/components/ScreenTitle'
import { SectionHead } from '@/components/SectionHead'
import { Button } from '@/components/ui/button'
import { Confirm } from '@/components/ui/confirm'
import { Sheet } from '@/components/ui/sheet'
import { plannable, useRoutines, type Routine } from '@/features/routines/useRoutines'
import { useActiveSession } from '@/features/training/useActiveSession'
import { TrainingStats } from '@/features/training/TrainingStats'
import { useSchedule, type DaySession, type ScheduleDay } from '@/features/training/useSchedule'
import { useWorkout } from '@/features/training/useWorkout'
import { addDays, todayKey } from '@/lib/date'
import { formatDayShort, weekdayLabel } from '@/lib/format'
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

  const { history } = useWorkout(today)
  const { routines, status: routinesStatus, create, remove, restore } = useRoutines()
  const planned = useMemo(() => plannable(routines), [routines])
  const { days, overrides, status, apply } = useSchedule(week[0], week[6], planned)

  // Which way the last week change went. Nothing reads it but the animation.
  const [direction, setDirection] = useState<-1 | 0 | 1>(0)
  const [moving, setMoving] = useState<Marked | null>(null)
  const [pending, setPending] = useState<{ a: Marked; b: Marked } | null>(null)

  const day = days.find((entry) => entry.date === selected)

  async function addRoutine() {
    const id = await create(t('pages.routines.defaultName'))
    if (!id) {
      toast(t('pages.routines.createFailed'))
      return
    }
    // `new`: the editor starts on step one with the name field waiting, and a
    // cancel there takes this row back out again.
    navigate(`/training/routines/${id}?new=1`)
  }

  function onMove(date: string, session: DaySession) {
    const mine = { routineId: session.routine.id, date, name: session.routine.name }
    if (!moving) return setMoving(mine)
    if (moving.date === date && moving.routineId === session.routine.id) return setMoving(null)
    setPending({ a: moving, b: mine })
    setMoving(null)
  }

  // The whole shape at once. Showing the strip while the day beneath it is a
  // loading line means the page arrives twice, and the second arrival is the
  // one that moves everything.
  if (status === 'loading' || routinesStatus === 'loading') {
    return (
      <>
        <ScreenTitle>{t('nav.training')}</ScreenTitle>
        <Loading label={t('common.loading')}>
          <StripSkeleton />
          <div className="mt-6 border-l-2 border-line py-1 pl-4">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="mt-3 h-8 w-2/3" />
            <Skeleton className="mt-4 h-1 w-full" />
            <Skeleton className="mt-3 h-3 w-24" />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Skeleton className="h-36 rounded-lg" />
            <Skeleton className="h-36 rounded-lg" />
          </div>
          <Skeleton className="mt-8 h-3 w-20" />
          <div className="mt-3">
            <RowsSkeleton />
          </div>
        </Loading>
      </>
    )
  }

  return (
    <>
      <ScreenTitle>{t('nav.training')}</ScreenTitle>

      <WeekStrip
        week={week}
        today={today}
        selected={selected}
        locale={locale}
        label={t('pages.training.week.label')}
        // A day is `done` once anything on it has been logged, `partial` while
        // it is only planned, and unmarked when it holds no session at all.
        markOf={(date) => {
          const day = days.find((entry) => entry.date === date)
          if (!day || day.sessions.length === 0) return 'none'
          return day.sessions.some((session) => session.loggedSets > 0) ? 'done' : 'partial'
        }}
        onSelect={setSelected}
        direction={direction}
        onShift={(by) => {
          setDirection(by)
          setSelected(addDays(selected, by * 7))
        }}
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
          onNew={() => void addRoutine()}
        />
      )}

      <TrainingStats history={history} routines={planned} today={today} locale={locale} />

      <RoutineList
        routines={routines}
        status={routinesStatus}
        locale={locale}
        onRemove={async (routine) => {
          if (!(await remove(routine.id))) return
          toast(t('pages.routines.deleted', { name: routine.name }), {
            action: {
              label: t('common.undo'),
              onClick: () => {
                void restore(routine).then((ok) => {
                  if (!ok) toast(t('pages.routines.undoFailed'))
                })
              },
            },
          })
        }}
      />

      <AddRoutine onAdd={addRoutine} />

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
 * The selected day: what is on it, and the way into it. The subject of the
 * screen, and the only thing on it allowed to be loud.
 *
 * It carries the accent edge (§6) rather than a panel border. The edge is the
 * house signature and this screen had quietly opted out of it, which is most of
 * why the screen read flat: a week strip, a day and a routine list in three
 * identical bordered boxes are three things all claiming to be the subject. One
 * marked block against two plain ones needs no boxes at all. Its muted twin in
 * `line-strong` — §6's own answer for something provisional — marks a rest day,
 * so an empty day is visibly the same object in a quieter state rather than a
 * different component.
 *
 * The card is the link: no button under it repeating what tapping the name
 * already does.
 */
function DayCard({
  day,
  today,
  locale,
  routines,
  marked,
  onMove,
  onPut,
  onNew,
}: {
  day: ScheduleDay | undefined
  today: string
  locale: string
  routines: { id: string; name: string }[]
  marked: Marked | null
  onMove: (date: string, session: DaySession) => void
  onPut: (routineId: string) => Promise<boolean>
  onNew: () => void
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

  const bare = day.sessions.length === 0

  return (
    <>
      {/* Keyed on the date: picking another day replaces this block, and it
          says so rather than swapping its text under you. */}
      <div
        key={day.date}
        className={`merit-rise mt-6 border-l-2 py-1 pl-4 ${bare ? 'border-line-strong' : 'border-accent'}`}
      >
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

        {bare ? (
          <>
            <p className="text-2xl font-semibold tracking-tight text-ink-faint">
              {t('pages.training.week.nothing')}
            </p>
            {routines.length > 0 ? (
              <Button variant="quiet" className="mt-4 w-full md:w-auto" onClick={() => setPicking(true)}>
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
              // A day that has been started leads to the session itself, not to
              // a preview of what it was going to be. Walking back in through
              // the training tab is how you get to the set you are on after
              // going off to look something up, and one hop is the whole point.
              to={
                session.workoutId
                  ? `/training/day?date=${day.date}`
                  : `/training/session?date=${day.date}&routine=${session.routine.id}`
              }
              className="-ml-4 mt-1 flex items-center gap-3 rounded-r-md py-2 pl-4 pr-2
                         transition-colors [transition-duration:140ms] hover:bg-surface-2
                         active:bg-surface-2 active:[transition-duration:0ms]"
            >
              <span className="min-w-0 flex-1">
                {/* `text-2xl` is §4.2's in-app ceiling and the dashboard's
                    primary number sits there. The subject of this screen has
                    the same standing and was two steps below it. */}
                <span className="block truncate text-2xl font-semibold tracking-tight text-ink">
                  {session.routine.name}
                </span>

                {session.totalSets > 0 ? (
                  // The figures were a sentence where the system has a bar for
                  // exactly this (§10.9), with the significant number promoted
                  // out of `ink-faint`. A started session is the one thing on
                  // this screen with a position against a target.
                  <span className="mt-3 block">
                    <Progress
                      total={session.loggedSets}
                      target={session.totalSets}
                      ariaLabel={t('pages.training.week.progress', {
                        logged: session.loggedSets,
                        total: session.totalSets,
                      })}
                      // The measurement and nothing else. That the session is
                      // under way is what the bar being there already says.
                      label={
                        <>
                          <span className="text-ink">{session.loggedSets}</span>
                          {' / '}
                          {t('pages.training.week.setCount', { count: session.totalSets })}
                        </>
                      }
                    />
                  </span>
                ) : (
                  <span className="mt-1 block truncate font-mono text-2xs text-ink-faint">
                    {t('pages.training.week.open')}
                  </span>
                )}
              </span>
              <span aria-hidden className="shrink-0 self-start pt-2 font-mono text-2xs text-ink-faint">
                →
              </span>
            </Link>
          ))
        )}
      </div>

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
          {/* Last, and in the same shape as the rest: the day you are looking
              at is often the reason you want a routine that does not exist yet,
              and sending you back to the screen behind the sheet to make one is
              a dead end with extra steps. */}
          <Row
            onClick={() => {
              setPicking(false)
              onNew()
            }}
          >
            <Plus size={15} strokeWidth={1.75} aria-hidden className="shrink-0 text-accent" />
            <span className="min-w-0 flex-1 truncate text-accent">
              {t('pages.training.week.putNew')}
            </span>
          </Row>
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
  onRemove,
}: {
  routines: Routine[]
  status: 'loading' | 'ready' | 'error'
  locale: string
  onRemove: (routine: Routine) => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState<string | null>(null)

  return (
    <section className="mt-8 pb-16">
      <SectionHead
        label={t('pages.routines.label')}
        hint={status === 'ready' ? String(routines.length) : undefined}
      />

      {/* §10.1: a delete 8px from a value in a 52px row gets hit by accident,
          so it costs a deliberate sideways drag — the same gesture the food log
          uses, and the same undo behind it (§17). */}

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
            <SwipeRow
              key={routine.id}
              open={open === routine.id}
              onOpenChange={(next) => setOpen(next ? routine.id : null)}
              label={t('pages.routines.swipe')}
              actions={
                <button
                  type="button"
                  onClick={() => {
                    setOpen(null)
                    onRemove(routine)
                  }}
                  className="flex w-full items-center justify-center bg-danger px-3 text-sm font-medium text-bg"
                >
                  {t('pages.routines.delete')}
                </button>
              }
            >
              <RowBody to={`/training/routines/${routine.id}`}>
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
              </RowBody>
            </SwipeRow>
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

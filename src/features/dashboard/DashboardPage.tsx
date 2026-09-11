import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { Statement } from '@/components/Statement'
import { ScreenTitle } from '@/components/ScreenTitle'
import { CalorieRing } from '@/features/dashboard/CalorieRing'
import { Cells } from '@/components/Cells'
import { Reveal } from '@/components/Reveal'
import { DashboardSkeleton } from '@/features/dashboard/DashboardSkeleton'
import { DomainCard } from '@/features/dashboard/DomainCard'
import { MuscleRecency } from '@/features/dashboard/MuscleRecency'
import { useGoalHistory } from '@/features/goals/useGoalHistory'
import { useFoodLog } from '@/features/nutrition/useFoodLog'
import { useFoodHistory } from '@/features/nutrition/useFoodHistory'
import { plannable, useRoutines, type Routine } from '@/features/routines/useRoutines'
import { useWorkout } from '@/features/training/useWorkout'
import { useWeightLogs } from '@/features/weight/useWeightLogs'
import { addDays, todayKey } from '@/lib/date'
import { formatDayShort, formatDelta, formatNumber, weekdayLabel } from '@/lib/format'
import { goalOn } from '@/lib/goals'
import { sumPortions } from '@/lib/nutrition'
import { plannedWeeks } from '@/lib/progress'
import { scheduledOn } from '@/lib/schedule'
import { dailyStreak, dayCells, weekCells, weeklyStreak } from '@/lib/streak'
import { isoWeekday, nextSession, type LoggedSet, type SessionSets } from '@/lib/training'
import { latestEntry, weeklyDelta, type WeightEntry } from '@/lib/weight'

/**
 * The way in.
 *
 * Not a report. A report is what every other screen already is, and stacking
 * four of them in identical bordered rectangles is what made this one feel like
 * a settings page. Almost nothing here is in a container: the ground is one
 * continuous surface, and what separates a block from the one under it is space
 * and type, the way it is in Fitness or Weather. The only fills are on the
 * things you swipe, and even those have no border.
 *
 * The rhythm is deliberately uneven. A date at display size, a body at the top
 * with nothing around it, then four readings packed into four different shapes
 *. A tall one holding a ring, two short ones beside it, a wide one under them
 *, each arriving from the edge it sits against. Four blocks of one width in
 * one column is something somebody scrolls past.
 */
export default function DashboardPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const today = todayKey()

  // Every query this screen needs, fetched once here and handed down.
  //
  // Each of these used to be called inside the card that wanted it, which meant
  // `useWorkout` ran five times and `useRoutines` three, eight round trips for
  // six answers, five of them the same 180-day query. Worse than the waste, each
  // copy held its own state and resolved at its own moment, so the screen
  // assembled in stages: the cards landed, then the body arrived underneath the
  // date and shoved everything down. One fetch each means one arrival.
  const { entries, status } = useFoodLog(today)
  const { goals, status: goalStatus } = useGoalHistory()
  const goal = goalOn(goals, today)
  const workout = useWorkout(today)
  const { routines, status: routineStatus } = useRoutines()
  const { days: loggedDays } = useFoodHistory(today)
  const { entries: weights, status: weightStatus } = useWeightLogs()

  const totals = sumPortions(
    entries.map((entry) => ({ nutrients: entry.food.nutrients, quantityG: entry.quantityG })),
  )

  // The whole screen, or the shape of it. Showing the date and the body while
  // the four readings are still empty rectangles is two arrivals rather than
  // one, and the second is the one that moves the page.
  if (
    status === 'loading' ||
    workout.status === 'loading' ||
    routineStatus === 'loading' ||
    weightStatus === 'loading' ||
    goalStatus === 'loading'
  ) {
    return (
      <>
        <ScreenTitle>{t('nav.dashboard')}</ScreenTitle>
        <DashboardSkeleton />
      </>
    )
  }

  return (
    <>
      <ScreenTitle>{t('nav.dashboard')}</ScreenTitle>

      {/* The date at display size, the way a large title opens a screen on this
          platform. It is also the only thing here that has to be true before
          anything has loaded. */}
      <header className="mb-2">
        <p className="font-mono text-2xs text-ink-faint">
          {weekdayLabel(isoWeekday(today), locale)}
        </p>
        <h2 className="mt-1 text-4xl font-semibold tracking-tight text-ink">
          {formatDayShort(today, locale)}
        </h2>
      </header>

      {/* The body, on the ground rather than in a box. It is the thing only
          this screen can show, so it gets the room and nothing frames it. */}
      <MuscleRecency history={workout.history} exercises={workout.exercises} today={today} />

      {/* Four readings in four different shapes, packed rather than stacked.
          The day's eating is tall and holds a ring, so it takes the left column
          across two rows; training and weight are one line each and sit beside
          it; the run underneath is wide and short and takes the full width.
          Nothing is the same size as anything else and nothing is centred, so
          the block is uneven without being mostly air, the version before this
          alternated sides and spent half the screen on the gaps.

          Each still arrives from the edge it sits against, the first time it is
          scrolled to. */}
      <section aria-label={t('pages.dashboard.summary')} className="mt-8 grid grid-cols-2 gap-3">
        <Reveal from="left" className="row-span-2">
          <NutritionCard
            entries={entries}
            goal={goal}
            status={status}
            totals={totals}
            locale={locale}
          />
        </Reveal>

        <Reveal from="right">
          <TrainingCard locale={locale} routines={routines} sets={workout.sets} />
        </Reveal>

        <Reveal from="right">
          <WeightCard locale={locale} entries={weights} />
        </Reveal>

        <Reveal from="left" className="col-span-2">
          <StreakCard
            loggedDays={loggedDays}
            routines={routines}
            history={workout.history}
            today={today}
          />
        </Reveal>
      </section>

      {/* One sentence, last, in the one serif line per screen §4.1 allows and
          on the accent edge §6 calls the signature. Read once the picture has
          already said where you stand. */}
      <div className="mt-8">
        <TrainingLine locale={locale} routines={routines} sets={workout.sets} />
      </div>
    </>
  )
}

/** The day's eating, as one card: the ring, and how much of the day is left. */
function NutritionCard({
  entries,
  goal,
  status,
  totals,
  locale,
}: {
  entries: unknown[]
  goal: { kcal: number; proteinG: number; fatG: number; carbsG: number } | null
  status: 'loading' | 'ready' | 'error'
  totals: ReturnType<typeof sumPortions>
  locale: string
}) {
  const { t } = useTranslation()

  if (status !== 'ready' || !goal) {
    return (
      <DomainCard to={goal ? '/food' : '/goals'} label={t('nav.food')} value="—">
        <p className="font-mono text-2xs text-ink-faint">
          {status === 'error'
            ? t('pages.dashboard.loadFailed')
            : status === 'loading'
              ? t('common.loading')
              : t('pages.dashboard.noTarget')}
        </p>
      </DomainCard>
    )
  }

  return (
    <Link
      to="/food"
      className="flex h-full flex-col gap-4 rounded-xl bg-surface p-4 transition-colors
                 [transition-duration:140ms] hover:bg-surface-2 active:bg-surface-2
                 active:[transition-duration:0ms]"
    >
      <p className="flex items-center justify-between gap-2 font-mono text-2xs text-ink-faint">
        {t('nav.food')}
        <span aria-hidden className="text-accent">
          →
        </span>
      </p>

      <CalorieRing total={totals.kcal.value} target={goal.kcal} locale={locale} />

      {/* The ring and nothing else. The three macro bars made this card twice
          the height of the other three, and a carousel where every card is as
          tall as the tallest turns that into dead space on all of them. The
          bars are one tap away on the screen this links to. */}
      {entries.length === 0 ? (
        <p className="text-center font-mono text-2xs text-ink-faint">
          {t('pages.dashboard.nothingLogged')}
        </p>
      ) : null}
    </Link>
  )
}

/** Today's session, or the next one. */
function TrainingCard({
  locale,
  routines,
  sets,
}: {
  locale: string
  routines: Routine[]
  sets: LoggedSet[]
}) {
  const { t } = useTranslation()
  const today = todayKey()

  const plan = plannable(routines)
  const due = scheduledOn(plan, [], today)[0]
  const logged = sets.filter((set) => set.done).length

  const note = due
    ? sets.length > 0
      ? t('pages.training.week.progress', { logged, total: sets.length })
      : t('pages.training.week.open')
    : (() => {
        const next = nextSession(plan, today)
        return next
          ? weekdayLabel(isoWeekday(addDays(today, next.inDays)), locale)
          : t('pages.training.week.nothing')
      })()

  return (
    <DomainCard
      domain="training"
      to="/training"
      label={t('nav.training')}
      note={note}
      value={due ? undefined : '—'}
    >
      {due ? (
        <p className="truncate text-lg font-semibold tracking-tight text-ink">{due.name}</p>
      ) : null}
    </DomainCard>
  )
}

/** The last weigh-in and where the week put it. */
function WeightCard({ locale, entries }: { locale: string; entries: WeightEntry[] }) {
  const { t } = useTranslation()
  const latest = latestEntry(entries)
  const delta = weeklyDelta(entries, todayKey())

  return (
    <DomainCard
      domain="weight"
      to="/weight"
      label={t('nav.weight')}
      value={latest ? formatNumber(latest.weightKg, locale, 1) : '—'}
      unit={latest ? 'kg' : undefined}
      // A change with its sign kept, and no colour on it: §17 rules out a
      // traffic light on a number, and neither direction is a verdict.
      note={
        delta === null
          ? t('pages.dashboard.weight.noTrend')
          : t('pages.dashboard.weight.week', {
              delta: formatDelta(delta, locale, 1),
            })
      }
    />
  )
}

/** Whichever run is worth reporting. One card, because one is one swipe. */
function StreakCard({
  loggedDays,
  routines,
  history,
  today,
}: {
  loggedDays: Set<string>
  routines: Routine[]
  history: SessionSets[]
  today: string
}) {
  const { t } = useTranslation()

  const days = dailyStreak(loggedDays, today)
  const weeks = plannedWeeks(history, plannable(routines), today, 12)
  const streak = weeklyStreak(weeks, today)

  // The longer of the two, and neither before there is a run to report
  // (PRODUCT.md). A card that says nothing is a card nobody should swipe to.
  const showTraining = streak > 0 && streak * 7 >= days

  if (days <= 1 && streak === 0) {
    return (
      <DomainCard to="/training" label={t('common.streak.training')} value="—">
        <p className="font-mono text-2xs text-ink-faint">{t('common.streak.none')}</p>
      </DomainCard>
    )
  }

  return showTraining ? (
    <DomainCard
      domain="training"
      to="/training"
      label={t('common.streak.training')}
      value={String(streak)}
      unit={t('common.streak.weeks', { count: streak })}
    >
      <Cells cells={weekCells(weeks, today, 12)} />
    </DomainCard>
  ) : (
    <DomainCard
      to="/food"
      label={t('common.streak.nutrition')}
      value={String(days)}
      unit={t('common.streak.days', { count: days })}
    >
      <Cells cells={dayCells(loggedDays, today, 14)} />
    </DomainCard>
  )
}

/**
 * Today's training, in one sentence (GOAL.md §6).
 *
 * Due and done is acknowledged once and quietly; due and not done is stated as
 * a fact; nothing due names when the next one is. §14 is explicit that a missed
 * session is a fact and not a rebuke, so none of these three sentences is
 * written to make anybody feel anything.
 *
 * The accent edge is the one piece of pure voice on the screen (§6), and there
 * is one per screen, this is it. It carries no button: every card below is a
 * way in, and a second one here would be the screen asking twice.
 */
function TrainingLine({
  locale,
  routines,
  sets,
}: {
  locale: string
  routines: Routine[]
  sets: LoggedSet[]
}) {
  const { t } = useTranslation()
  const today = todayKey()

  const plan = routines.map((routine) => ({
    id: routine.id,
    name: routine.name,
    weekdays: routine.weekdays,
  }))
  const weekday = isoWeekday(today)
  const due = plan.find((entry) => entry.weekdays.includes(weekday))
  const trained = sets.length > 0

  const sentence = () => {
    if (due && trained) return t('pages.dashboard.training.doneToday', { name: due.name })
    if (due) return t('pages.dashboard.training.due', { name: due.name })

    const next = nextSession(plan, today)
    if (!next) return t('pages.dashboard.training.nothingPlanned')
    if (next.inDays === 1) {
      return `${t('pages.dashboard.training.rest')} ${t('pages.dashboard.training.nextTomorrow', { name: next.day.name })}`
    }
    return `${t('pages.dashboard.training.rest')} ${t('pages.dashboard.training.next', {
      name: next.day.name,
      day: weekdayLabel(isoWeekday(addDays(today, next.inDays)), locale),
    })}`
  }

  return <Statement>{sentence()}</Statement>
}

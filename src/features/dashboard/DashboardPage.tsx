import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { Panel } from '@/components/Panel'
import { Statement } from '@/components/Statement'
import { Progress } from '@/components/Progress'
import { ScreenTitle } from '@/components/ScreenTitle'
import { SectionHead } from '@/components/SectionHead'
import { Button } from '@/components/ui/button'
import { CalorieRing } from '@/features/dashboard/CalorieRing'
import { useGoalHistory } from '@/features/goals/useGoalHistory'
import { useFoodLog } from '@/features/nutrition/useFoodLog'
import { usePlanPause } from '@/features/routines/usePlanPause'
import { useRoutines } from '@/features/routines/useRoutines'
import { useWorkout } from '@/features/training/useWorkout'
import { addDays, todayKey } from '@/lib/date'
import { formatDayLong, formatNumber, weekdayLabel } from '@/lib/format'
import { goalOn } from '@/lib/goals'
import { sumPortions } from '@/lib/nutrition'
import { isoWeekday, nextSession, performed, planPaused } from '@/lib/training'

/**
 * What the day looks like, top to bottom (GOAL.md §6): a calm summary, then
 * today's nutrition, then today's training.
 *
 * The nutrition block is §10.10's day summary — the ring, then the three
 * nutrients that carry user-set targets. Fibre, sugars, saturates and salt are
 * deliberately absent: they use reference values and are off by default, and
 * most people do not want seven bars every morning.
 */
export default function DashboardPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const today = todayKey()

  const { entries, status } = useFoodLog(today)
  const { goals } = useGoalHistory()
  const goal = goalOn(goals, today)

  const totals = sumPortions(
    entries.map((entry) => ({ nutrients: entry.food.nutrients, quantityG: entry.quantityG })),
  )

  return (
    <>
      <ScreenTitle>{t('nav.dashboard')}</ScreenTitle>

      <section>
        <SectionHead label={t('pages.dashboard.summary')} />
        <Panel className="px-4 py-6">
          {status === 'error' ? (
            <p role="alert" className="text-sm text-danger">
              {t('pages.dashboard.loadFailed')}
            </p>
          ) : status === 'loading' ? (
            <p className="font-mono text-2xs text-ink-faint">{t('common.loading')}</p>
          ) : !goal ? (
            // No target means nothing to measure against, and a ring with no
            // target is a decoration. Say what is missing and how to fix it.
            <div className="text-center">
              <p className="font-mono text-2xs text-ink-faint">{t('pages.dashboard.noTarget')}</p>
              <Button asChild variant="tinted" className="mt-4">
                <Link to="/goals">{t('pages.dashboard.setTarget')}</Link>
              </Button>
            </div>
          ) : (
            <>
              <CalorieRing total={totals.kcal.value} target={goal.kcal} locale={locale} />

              {/* Only the three with user-set targets. No colour per nutrient:
                  they are told apart by label and fixed position (§10.10). */}
              <ul className="mt-6 flex flex-col gap-4">
                {(
                  [
                    ['protein', totals.protein.value, goal.proteinG],
                    ['fat', totals.fat.value, goal.fatG],
                    ['carbs', totals.carbs.value, goal.carbsG],
                  ] as const
                ).map(([nutrient, value, target]) => (
                  <li key={nutrient}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate text-sm">
                        {t(`pages.food.nutrients.${nutrient}`)}
                      </span>
                      <span className="shrink-0 font-mono text-2xs tabular-nums text-ink-faint">
                        <span className="text-ink">{formatNumber(value, locale, 0)}</span> /{' '}
                        {formatNumber(target, locale, 0)} g
                      </span>
                    </div>
                    <Progress
                      total={value}
                      target={target}
                      ariaLabel={`${t(`pages.food.nutrients.${nutrient}`)} ${formatNumber(value, locale, 0)} / ${formatNumber(target, locale, 0)} g`}
                    />
                  </li>
                ))}
              </ul>

              {entries.length === 0 ? (
                <p className="mt-6 text-center font-mono text-2xs text-ink-faint">
                  {t('pages.dashboard.nothingLogged')}
                </p>
              ) : null}

              <Button asChild variant="primary" className="mt-6 w-full">
                <Link to="/food">{t('pages.dashboard.logFood')}</Link>
              </Button>
            </>
          )}
        </Panel>
      </section>

      <section className="mt-8">
        <SectionHead label={t('pages.dashboard.training.label')} />
        <TrainingLine locale={locale} />
      </section>
    </>
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
 * is one per screen — this is it.
 */
function TrainingLine({ locale }: { locale: string }) {
  const { t } = useTranslation()
  const today = todayKey()
  const { routines, status } = useRoutines()
  const { sets } = useWorkout(today)
  const { pausedUntil } = usePlanPause()

  if (status === 'loading') {
    return <p className="font-mono text-2xs text-ink-faint">{t('common.loading')}</p>
  }

  const plan = routines.map((routine) => ({
    id: routine.id,
    name: routine.name,
    weekdays: routine.weekdays,
  }))
  const weekday = isoWeekday(today)
  const due = plan.find((entry) => entry.weekdays.includes(weekday))
  const trained = performed(sets).length > 0

  const sentence = () => {
    // A paused plan reports nothing as due, and says so rather than going
    // quiet — otherwise it looks like the plan was forgotten.
    if (planPaused(pausedUntil, today)) {
      return t('pages.dashboard.training.paused', {
        date: formatDayLong(pausedUntil as string, locale),
      })
    }
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

  return (
    <>
      <Statement>{sentence()}</Statement>
      <Button asChild variant="quiet" className="mt-4">
        <Link to="/training">{t('pages.dashboard.training.open')}</Link>
      </Button>
    </>
  )
}

import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { NotBuiltYet } from '@/components/NotBuiltYet'
import { Panel } from '@/components/Panel'
import { Progress } from '@/components/Progress'
import { ScreenTitle } from '@/components/ScreenTitle'
import { SectionHead } from '@/components/SectionHead'
import { Button } from '@/components/ui/button'
import { CalorieRing } from '@/features/dashboard/CalorieRing'
import { useGoalHistory } from '@/features/goals/useGoalHistory'
import { useFoodLog } from '@/features/nutrition/useFoodLog'
import { todayKey } from '@/lib/date'
import { formatNumber } from '@/lib/format'
import { goalOn } from '@/lib/goals'
import { sumPortions } from '@/lib/nutrition'

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
        <NotBuiltYet label={t('common.notBuiltYet')}>
          {t('pages.dashboard.training.planned')}
        </NotBuiltYet>
      </section>
    </>
  )
}

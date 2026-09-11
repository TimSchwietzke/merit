import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { EmptyState } from '@/components/EmptyState'
import { Panel } from '@/components/Panel'
import { Loading, RowsSkeleton, Skeleton, StripSkeleton } from '@/components/Skeleton'
import { Streak } from '@/components/Streak'
import { Cells } from '@/components/Cells'
import { StatCard } from '@/components/StatCard'
import { WeekStrip } from '@/components/WeekStrip'
import { CalorieRing } from '@/features/dashboard/CalorieRing'
import { useFoodHistory } from '@/features/nutrition/useFoodHistory'
import { averageKcal, daysOnTarget, kcalSeries } from '@/lib/nutrition-progress'
import { weekOf } from '@/lib/schedule'
import { dailyStreak, dayCells } from '@/lib/streak'
import { RowBody, Rows } from '@/components/Rows'
import { SwipeRow } from '@/components/SwipeRow'
import { ScreenTitle } from '@/components/ScreenTitle'
import { SectionHead } from '@/components/SectionHead'
import { Value } from '@/components/Value'
import { Button } from '@/components/ui/button'
import { useGoalHistory } from '@/features/goals/useGoalHistory'
import { useFoodLog, type LoggedFood } from '@/features/nutrition/useFoodLog'
import { goalOn } from '@/lib/goals'
import { addDays, todayKey } from '@/lib/date'
import { formatNumber } from '@/lib/format'
import {
  isComplete,
  LABEL_ORDER,
  MEAL_TYPES,
  sumPortions,
  type MealType,
  type Portion,
} from '@/lib/nutrition'

/**
 * The day: what was eaten, at which meal, and what it comes to.
 *
 * The day lives in the query string rather than in state, so a day is a link:
 * the add screen can send you back to the one you came from, and a reload does
 * not silently jump to today (§7: one route, one file).
 */
export default function FoodPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const [params, setParams] = useSearchParams()

  const today = todayKey()
  const date = params.get('date') ?? today
  const { entries, status, remove, restore } = useFoodLog(date)
  const { days: loggedDays, totals: history } = useFoodHistory(today)
  const streak = dailyStreak(loggedDays, today)
  const [openRow, setOpenRow] = useState<string | null>(null)
  const { goals } = useGoalHistory()
  const goal = goalOn(goals, date)

  const average = averageKcal(history, today, 7)
  const onTarget = daysOnTarget(history, goal?.kcal ?? 0, today, 14)
  // Two weeks, not four: twenty-eight cells across half a column are four
  // pixels each and read as a barcode. One cell per day, filled where the day
  // landed inside the band and empty where it did not or was never logged:
  // the same mosaic as the run below it, so the two are one vocabulary.
  const bandCells = kcalSeries(history, today, 14).map(
    (day) =>
      day.kcal !== null &&
      goal !== null &&
      day.kcal >= goal.kcal * 0.8 &&
      day.kcal <= goal.kcal * 1.2,
  )

  const toPortion = (entry: LoggedFood): Portion => ({
    nutrients: entry.food.nutrients,
    quantityG: entry.quantityG,
  })
  const totals = sumPortions(entries.map(toPortion))

  const goto = (next: string) => setParams(next === today ? {} : { date: next })
  // Which way the last week change went, so the strip arrives from that side.
  const [direction, setDirection] = useState<-1 | 0 | 1>(0)

  async function onRemove(entry: LoggedFood) {
    if (!(await remove(entry.id))) return
    toast(t('pages.food.deleted', { name: entry.food.name }), {
      action: {
        label: t('common.undo'),
        onClick: () => {
          void restore(entry).then((ok) => {
            if (!ok) toast(t('pages.food.undoFailed'))
          })
        },
      },
    })
  }

  if (status === 'loading') {
    return (
      <>
        <ScreenTitle>{t('nav.food')}</ScreenTitle>
        <Loading label={t('common.loading')}>
          <StripSkeleton />
          <Skeleton className="mt-6 h-3 w-16" />
          <div className="mt-3 rounded-lg border border-line bg-surface px-4 py-5">
            <Skeleton className="mx-auto size-[168px] rounded-full" />
            <Skeleton className="mx-auto mt-4 h-3 w-32" />
            <div className="mt-6 flex flex-col gap-4">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-4 w-full" />
              ))}
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Skeleton className="h-40 rounded-lg" />
            <Skeleton className="h-40 rounded-lg" />
          </div>
          <Skeleton className="mt-8 h-3 w-20" />
          <div className="mt-3">
            <RowsSkeleton rows={2} />
          </div>
        </Loading>
      </>
    )
  }

  return (
    <>
      <ScreenTitle>{t('nav.food')}</ScreenTitle>

      {/* The same strip training carries, in moss. A pair of chevrons around
          a date said which day you were on and nothing else; seven tiles say
          which days you logged as well, and they are the same control on both
          screens rather than two things to learn. */}
      <WeekStrip
        week={weekOf(date)}
        today={today}
        selected={date}
        locale={locale}
        label={t('common.week.label')}
        // Logged or not. There is no half state here: a day either has food on
        // it or it does not.
        markOf={(day) => (loggedDays.has(day) ? 'done' : 'none')}
        onSelect={(day) => goto(day > today ? today : day)}
        direction={direction}
        onShift={(by) => {
          setDirection(by)
          const next = addDays(date, by * 7)
          goto(next > today ? today : next)
        }}
      />

      <section className="mt-6">
        <SectionHead label={t('pages.food.totals.label')} />
        <Panel className="px-4 py-5">
          {/* The ring, not a figure with a bar under it. A sum against a target
              is a ring (§10.10), it is nutrition's own motif, and it had ended
              up only on the dashboard, so the screen the motif belongs to was
              the one screen not using it. */}
          {goal ? (
            <CalorieRing total={totals.kcal.value} target={goal.kcal} locale={locale} />
          ) : (
            <Value n={formatNumber(totals.kcal.value, locale, 0)} unit="kcal" size="xl" />
          )}

          {/* Without a target there is nothing to compare against, so the line
              says how to get one rather than pretending the day is complete.
              With one, the ring above has already said the figure, the target
              and what is left. Repeating it as a bar underneath is the screen
              saying the same number twice. */}
          {goal ? null : (
            <div className="mt-4">
              <Link
                to="/goals"
                className="inline-flex min-h-11 items-center font-mono text-2xs text-accent underline decoration-1 underline-offset-2"
              >
                {t('pages.food.totals.noTarget')} →
              </Link>
            </div>
          )}

          {/* EU label order, so the screen reads like the packaging (§10.10).
              No bars yet. A bar needs a target, and targets are their own
              slice. The values and the partial marker are the honest part. */}
          <ul className="mt-4 divide-y divide-line border-t border-line">
            {LABEL_ORDER.map((nutrient) => {
              const total = totals[nutrient]
              const sub = nutrient === 'saturatedFat' || nutrient === 'sugars'
              return (
                <li key={nutrient} className="flex items-baseline justify-between gap-3 py-2">
                  {/* Wraps rather than truncating (§4.1). `davon gesättigte
                      fettsäuren` is the app's worst case and it lost its ending
                      to the marker beside it; the label is the part that says
                      what the number is. */}
                  <span className={`min-w-0 text-sm ${sub ? 'pl-4 text-ink-muted' : ''}`}>
                    {t(`pages.food.nutrients.${nutrient}`)}
                  </span>

                  {/* The marker replaces the number rather than sitting beside
                      it (§10.10): a figure summed from three of five foods is
                      wrong, and showing it next to a caveat still reads as the
                      day's total to anybody scanning the column. */}
                  {isComplete(total) ? (
                    <span className="shrink-0 font-mono text-sm tabular-nums text-ink">
                      {formatNumber(total.value, locale, 1)}
                      <span className="ml-1 text-2xs text-ink-faint">g</span>
                    </span>
                  ) : (
                    <span className="shrink-0 text-right font-mono text-2xs text-ink-faint">
                      {total.known === 0
                        ? t('pages.food.totals.none')
                        : t('pages.food.totals.partial', { known: total.known, total: total.total })}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </Panel>
      </section>

      {goal ? (
        <section className="mt-6 grid grid-cols-2 gap-3">
          <StatCard
            id="stat-kcal"
            label={t('pages.food.stats.average')}
            value={average === null ? '—' : formatNumber(average, locale, 0)}
            unit="kcal"
            note={t('pages.food.stats.overDays', { count: 7 })}
            points={kcalSeries(history, today, 14)}
            series="kcal"
          />
          <StatCard
            id="stat-onTarget"
            label={t('pages.food.stats.onTarget')}
            value={String(onTarget.met)}
            unit={t('pages.food.stats.ofLogged', { count: onTarget.logged })}
            note={t('pages.food.stats.band')}
          >
            <Cells cells={bandCells} />
          </StatCard>
        </section>
      ) : null}

      {/* Only once there is a run worth calling one. A `0` under a strip of
          fourteen empty cells on somebody's first day is the app opening with
          a reproach. */}
      {streak > 1 ? (
        <section className="mt-6">
          <Panel className="p-4">
            <Streak
              label={t('common.streak.nutrition')}
              count={streak}
              cells={dayCells(loggedDays, today, 14)}
              caption={t('common.streak.days', { count: streak })}
            />
          </Panel>
        </section>
      ) : null}

      <section className="mt-8">
        <SectionHead label={t('pages.food.log.label')} />

        {status === 'error' ? (
          <p role="alert" className="text-sm text-danger">
            {t('pages.food.loadFailed')}
          </p>
        ) : entries.length === 0 ? (
          <EmptyState>{t('pages.food.log.empty')}</EmptyState>
        ) : (
          // Only the meals that have something in them. Four empty headings on
          // an empty morning is furniture, not information.
          MEAL_TYPES.filter((meal) => entries.some((entry) => entry.mealType === meal)).map((meal) => (
            <Meal
              key={meal}
              meal={meal}
              date={date}
              entries={entries.filter((entry) => entry.mealType === meal)}
              locale={locale}
              openRow={openRow}
              onOpenRow={setOpenRow}
              onRemove={onRemove}
            />
          ))
        )}

        {/* The primary actions, in the lower half where a thumb reaches (§7).
            Scanning is the tinted one rather than a second primary: §10.4 allows
            one primary per screen, and the search covers what a scan cannot. */}
        <div className="mt-6 flex flex-col gap-3 md:flex-row">
          <Button asChild variant="primary">
            <Link to={`/food/add?date=${date}`}>{t('pages.food.log.add')}</Link>
          </Button>
          <Button asChild variant="tinted">
            <Link to={`/food/add?date=${date}&scan=1`}>{t('pages.food.scan.open')}</Link>
          </Button>
        </div>
      </section>
    </>
  )
}

function Meal({
  meal,
  date,
  entries,
  locale,
  openRow,
  onOpenRow,
  onRemove,
}: {
  meal: MealType
  date: string
  entries: LoggedFood[]
  locale: string
  openRow: string | null
  onOpenRow: (id: string | null) => void
  onRemove: (entry: LoggedFood) => void
}) {
  const { t } = useTranslation()
  const kcal = sumPortions(
    entries.map((entry) => ({ nutrients: entry.food.nutrients, quantityG: entry.quantityG })),
  ).kcal.value

  return (
    <section className="mb-5 last:mb-0">
      <SectionHead
        label={t(`pages.food.meals.${meal}`)}
        hint={`${formatNumber(kcal, locale, 0)} kcal`}
      />
      <Rows>
        {entries.map((entry) => (
          // Tapping opens the portion; removing it costs a deliberate sideways
          // drag (§10.1). The screen the tap opens carries a delete button of
          // its own, so the gesture is never the only way to reach it.
          <SwipeRow
            key={entry.id}
            open={openRow === entry.id}
            onOpenChange={(open) => onOpenRow(open ? entry.id : null)}
            label={t('pages.food.log.swipe')}
            actions={
              <button
                type="button"
                onClick={() => {
                  onOpenRow(null)
                  onRemove(entry)
                }}
                className="flex w-full items-center justify-center bg-danger px-3 text-sm font-medium text-bg"
              >
                {t('pages.food.log.remove')}
              </button>
            }
          >
            <RowBody to={`/food/entry/${entry.id}?date=${date}`}>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{entry.food.name}</span>
                {entry.food.brand ? (
                  <span className="block truncate text-sm text-ink-muted">{entry.food.brand}</span>
                ) : null}
              </span>
              <span className="shrink-0 font-mono text-2xs tabular-nums text-ink-faint">
                {formatNumber(entry.quantityG, locale, 0)} g
              </span>
              <span className="shrink-0">
                <Value
                  n={formatNumber((entry.food.nutrients.kcal * entry.quantityG) / 100, locale, 0)}
                  unit="kcal"
                />
              </span>
            </RowBody>
          </SwipeRow>
        ))}
      </Rows>
    </section>
  )
}

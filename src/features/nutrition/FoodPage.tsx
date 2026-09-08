import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

import { EmptyState } from '@/components/EmptyState'
import { Panel } from '@/components/Panel'
import { Row, Rows } from '@/components/Rows'
import { ScreenTitle } from '@/components/ScreenTitle'
import { SectionHead } from '@/components/SectionHead'
import { Value } from '@/components/Value'
import { Button } from '@/components/ui/button'
import { useFoodLog, type LoggedFood } from '@/features/nutrition/useFoodLog'
import { addDays, todayKey } from '@/lib/date'
import { formatDayLong, formatNumber } from '@/lib/format'
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
 * The day lives in the query string rather than in state, so a day is a link —
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

  const toPortion = (entry: LoggedFood): Portion => ({
    nutrients: entry.food.nutrients,
    quantityG: entry.quantityG,
  })
  const totals = sumPortions(entries.map(toPortion))

  const goto = (next: string) => setParams(next === today ? {} : { date: next })

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

  return (
    <>
      <ScreenTitle>{t('nav.food')}</ScreenTitle>

      {/* The day is the screen's subject, so it is the first thing on it. Next
          is disabled on today: there is nothing to log for tomorrow. */}
      <div className="flex items-center justify-between gap-2">
        <Button variant="bare" size="icon" aria-label={t('pages.food.day.previous')} onClick={() => goto(addDays(date, -1))}>
          <ChevronLeft />
        </Button>
        <p className="min-w-0 truncate text-center font-mono text-2xs text-ink">
          {date === today ? t('common.today') : formatDayLong(date, locale)}
        </p>
        <Button
          variant="bare"
          size="icon"
          aria-label={t('pages.food.day.next')}
          disabled={date >= today}
          onClick={() => goto(addDays(date, 1))}
        >
          <ChevronRight />
        </Button>
      </div>

      <section className="mt-6">
        <SectionHead label={t('pages.food.totals.label')} />
        <Panel className="px-4 py-3.5">
          <Value n={formatNumber(totals.kcal.value, locale, 0)} unit="kcal" size="xl" />

          {/* EU label order, so the screen reads like the packaging (§10.10).
              No bars yet — a bar needs a target, and targets are their own
              slice. The values and the partial marker are the honest part. */}
          <ul className="mt-4 divide-y divide-line border-t border-line">
            {LABEL_ORDER.map((nutrient) => {
              const total = totals[nutrient]
              const sub = nutrient === 'saturatedFat' || nutrient === 'sugars'
              return (
                <li key={nutrient} className="flex items-baseline justify-between gap-3 py-2">
                  <span className={`min-w-0 truncate text-sm ${sub ? 'pl-4 text-ink-muted' : ''}`}>
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

      <section className="mt-8">
        <SectionHead label={t('pages.food.log.label')} />

        {status === 'error' ? (
          <p role="alert" className="text-sm text-danger">
            {t('pages.food.loadFailed')}
          </p>
        ) : status === 'loading' ? (
          <p className="font-mono text-2xs text-ink-faint">{t('common.loading')}</p>
        ) : entries.length === 0 ? (
          <EmptyState>{t('pages.food.log.empty')}</EmptyState>
        ) : (
          // Only the meals that have something in them. Four empty headings on
          // an empty morning is furniture, not information.
          MEAL_TYPES.filter((meal) => entries.some((entry) => entry.mealType === meal)).map((meal) => (
            <Meal
              key={meal}
              meal={meal}
              entries={entries.filter((entry) => entry.mealType === meal)}
              locale={locale}
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
  entries,
  locale,
  onRemove,
}: {
  meal: MealType
  entries: LoggedFood[]
  locale: string
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
          // Tapping a row removes it, and the toast undoes that. A visible
          // delete control 8px from a value in a 52px row gets hit by accident
          // (§10.1); an undo makes the tap safe (§14).
          <Row key={entry.id} onClick={() => onRemove(entry)}>
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
          </Row>
        ))}
      </Rows>
    </section>
  )
}

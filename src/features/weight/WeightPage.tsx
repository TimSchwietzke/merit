import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Cells } from '@/components/Cells'
import { Panel } from '@/components/Panel'
import { Loading, RowsSkeleton, Skeleton } from '@/components/Skeleton'
import { StatCard } from '@/components/StatCard'
import { ScreenTitle } from '@/components/ScreenTitle'
import { SectionHead } from '@/components/SectionHead'
import { SegmentedControl } from '@/components/SegmentedControl'
import { WeightChart } from '@/features/weight/WeightChart'
import { dayCells } from '@/lib/streak'
import { WeightForm } from '@/features/weight/WeightForm'
import { WeightList } from '@/features/weight/WeightList'
import { useWeightLogs } from '@/features/weight/useWeightLogs'
import { daysBetween, todayKey } from '@/lib/date'
import { formatDayShort, formatDelta, formatNumber } from '@/lib/format'
import {
  buildSeries,
  latestEntry,
  rangeStart,
  weeklyDelta,
  WEIGHT_RANGES,
  type WeightEntry,
  type WeightRange,
} from '@/lib/weight'

/**
 * Body weight: where it is now, where it is going, and the day being logged.
 *
 * Top to bottom. The last weigh-in with its change against last week, the
 * trend, the form, then the log. The form sits in the lower half on purpose:
 * the top of a phone screen is the hardest place to reach one-handed and this
 * is a screen used standing on a scale (DESIGN.md §7).
 */
export default function WeightPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const { entries, status, save, remove } = useWeightLogs()

  const today = todayKey()
  const [selected, setSelected] = useState(today)
  const [range, setRange] = useState<WeightRange>('30')

  const latest = latestEntry(entries)
  const delta = weeklyDelta(entries, today)
  const selectedEntry = entries.find((entry) => entry.date === selected) ?? null

  // `all` starts at the first weigh-in; every other range is counted back from
  // today, so a fortnight with no entries reads as a fortnight with no entries.
  const from = rangeStart(range, today) ?? entries[0]?.date ?? today
  const points = buildSeries(entries, from, today)

  // The chart and the log show the same stretch of time. They used to disagree
  // (thirty days above, everything below) and "everything" is a hundred rows
  // by spring. The range is the answer to how long the list is, which is why
  // its control appears at both ends of the screen: reading the log and having
  // to scroll back to the chart to change what the log shows is the annoyance.
  const visible = entries.filter((entry) => daysBetween(from, entry.date) >= 0)

  // The range's own numbers. Only weigh-ins that happened, a day nobody stood
  // on the scale is not a weight, and averaging it in as one would be the same
  // mistake as summing a missing nutrient as zero.
  const logged = visible.filter((entry) => entry.weightKg !== null)
  const mean = logged.reduce((sum, entry) => sum + entry.weightKg, 0) / (logged.length || 1)
  const change =
    logged.length > 1 ? logged[logged.length - 1].weightKg - logged[0].weightKg : 0
  const weighed = dayCells(
    entries.map((entry) => entry.date),
    today,
    14,
  )

  const rangeControl = (
    <SegmentedControl<WeightRange>
      label={t('pages.weight.range')}
      value={range}
      onChange={setRange}
      segments={WEIGHT_RANGES.map((value) => ({
        value,
        label:
          value === 'all'
            ? t('pages.weight.chart.ranges.all')
            : t('pages.weight.chart.ranges.days', { days: value }),
      }))}
    />
  )

  async function onDelete(date: string) {
    const deleted = entries.find((entry) => entry.date === date)
    if (!deleted) return false

    const removed = await remove(date)
    if (!removed) return false

    setSelected(today)
    // The one thing Merit toasts. A deletion always offers a way back (§14),
    // and there is nowhere in place to put it once the row is gone.
    toast(t('pages.weight.deleted', { date: formatDayShort(date, locale) }), {
      action: {
        label: t('common.undo'),
        onClick: () => {
          void restore(deleted)
        },
      },
    })
    return true
  }

  async function restore(entry: WeightEntry) {
    if (await save(entry)) return
    toast(t('pages.weight.undoFailed'))
  }

  if (status === 'loading') {
    return (
      <>
        <ScreenTitle>{t('nav.weight')}</ScreenTitle>
        <Loading label={t('common.loading')}>
          <Skeleton className="h-3 w-24" />
          <div className="mt-3 rounded-lg border border-line bg-surface px-4 py-3.5">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="mt-2 h-3 w-40" />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
          </div>
          <Skeleton className="mt-8 h-3 w-20" />
          <Skeleton className="mt-3 h-56 rounded-lg" />
          <Skeleton className="mt-8 h-3 w-24" />
          <div className="mt-3">
            <RowsSkeleton rows={4} />
          </div>
        </Loading>
      </>
    )
  }

  return (
    <>
      <ScreenTitle>{t('nav.weight')}</ScreenTitle>

      <section>
        <SectionHead label={t('pages.weight.latest.label')} />
        <Panel className="px-4 py-3.5">
          {latest ? (
            <>
              {/* `text-3xl` mono, the size training's volume and nutrition's
                  ring already stand at. This screen's one figure was two steps
                  below theirs. */}
              <p className="font-mono tabular-nums leading-none">
                <span className="text-3xl font-medium text-ink">
                  {formatNumber(latest.weightKg, locale)}
                </span>
                <span className="ml-1 text-2xs text-ink-faint">kg</span>
              </p>
              {/* A number with a comparison, not a bare figure (§14). The
                  comparison is between two seven-day averages: a single day
                  swings by a kilo on water alone. */}
              <p className="mt-1.5 font-mono text-2xs text-ink-faint">
                {latest.date === today ? t('common.today') : formatDayShort(latest.date, locale)}
                {delta === null ? null : (
                  <>
                    {' · '}
                    <span className="text-ink">{formatDelta(delta, locale)} kg</span>{' '}
                    {t('pages.weight.latest.vsLastWeek')}
                  </>
                )}
              </p>
            </>
          ) : (
            <p className="font-mono text-2xs text-ink-faint">
              {t('pages.weight.latest.none')}
            </p>
          )}
        </Panel>
      </section>

      {/* Two readings over the range, in the same cards training and nutrition
          use. The screen had a chart and no numbers off it, so the range
          control changed a picture and nothing you could quote. */}
      {logged.length > 1 ? (
        <section className="mt-6 grid grid-cols-2 gap-3">
          <StatCard
            id="stat-weight-mean"
            label={t('pages.weight.stats.mean')}
            value={formatNumber(mean, locale)}
            unit="kg"
            note={t('pages.weight.stats.overDays', { count: logged.length })}
          />
          <StatCard
            id="stat-weight-change"
            label={t('pages.weight.stats.change')}
            value={formatDelta(change, locale)}
            unit="kg"
            note={t('pages.weight.stats.acrossRange')}
          >
            <Cells cells={weighed} />
          </StatCard>
        </section>
      ) : null}

      <section className="mt-8">
        <SectionHead label={t('pages.weight.chart.label')} hint={rangeControl} />
        {/* In a panel like every other chart in the app. It sat bare on the
            page, which was the old hairline language showing through. */}
        <Panel className="px-2 py-4">
          <WeightChart points={points} locale={locale} />
        </Panel>
      </section>

      <section className="mt-8">
        <SectionHead
          label={t('pages.weight.form.label')}
          hint={selectedEntry ? t('pages.weight.form.correcting') : null}
        />
        {/* Keyed on the day so picking another one remounts the form with that
            day's values rather than syncing state in an effect. The screen no
            longer renders at all until the rows are in, so mounting it here
            cannot leave an empty field on a day that already has a weight. */}
        <WeightForm
          key={selected}
          date={selected}
          entry={selectedEntry}
          onDateChange={setSelected}
          onSave={save}
          onDelete={onDelete}
        />
      </section>

      <section className="mt-8">
        <SectionHead label={t('pages.weight.list.label')} hint={rangeControl} />
        {status === 'error' ? (
          <p role="alert" className="text-sm text-danger">
            {t('pages.weight.loadFailed')}
          </p>
        ) : (
          <WeightList
            entries={visible}
            selected={selected}
            empty={t(entries.length === 0 ? 'pages.weight.list.empty' : 'pages.weight.list.emptyRange')}
            onSelect={setSelected}
          />
        )}
      </section>
    </>
  )
}

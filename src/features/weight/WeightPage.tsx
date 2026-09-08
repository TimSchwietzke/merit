import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Panel } from '@/components/Panel'
import { ScreenTitle } from '@/components/ScreenTitle'
import { SectionHead } from '@/components/SectionHead'
import { SegmentedControl } from '@/components/SegmentedControl'
import { Value } from '@/components/Value'
import { WeightChart } from '@/features/weight/WeightChart'
import { WeightForm } from '@/features/weight/WeightForm'
import { WeightList } from '@/features/weight/WeightList'
import { useWeightLogs } from '@/features/weight/useWeightLogs'
import { daysBetween, todayKey } from '@/lib/date'
import { formatDayShort, formatDelta, formatNumber } from '@/lib/format'
import {
  AVERAGE_WINDOW_DAYS,
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
 * Top to bottom — the last weigh-in with its change against last week, the
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
  // — thirty days above, everything below — and "everything" is a hundred rows
  // by spring. The range is the answer to how long the list is, which is why
  // its control appears at both ends of the screen: reading the log and having
  // to scroll back to the chart to change what the log shows is the annoyance.
  const visible = entries.filter((entry) => daysBetween(from, entry.date) >= 0)

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

  return (
    <>
      <ScreenTitle>{t('nav.weight')}</ScreenTitle>

      <section>
        <SectionHead label={t('pages.weight.latest.label')} />
        <Panel className="px-4 py-3.5">
          {latest ? (
            <>
              <Value n={formatNumber(latest.weightKg, locale)} unit="kg" size="xl" />
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
              {status === 'loading' ? t('common.loading') : t('pages.weight.latest.none')}
            </p>
          )}
        </Panel>
      </section>

      <section className="mt-8">
        <SectionHead label={t('pages.weight.chart.label')} hint={rangeControl} />
        {status === 'loading' ? (
          <p className="font-mono text-2xs text-ink-faint">{t('common.loading')}</p>
        ) : (
          <WeightChart points={points} locale={locale} />
        )}
      </section>

      <section className="mt-8">
        <SectionHead
          label={t('pages.weight.form.label')}
          hint={selectedEntry ? t('pages.weight.form.correcting') : null}
        />
        {/* Keyed on the day so picking another one remounts the form with that
            day's values rather than syncing state in an effect — which is also
            why it waits for the rows: mounting before they arrive would leave
            an empty field on a day that already has a weight. */}
        {status === 'loading' ? (
          <p className="font-mono text-2xs text-ink-faint">{t('common.loading')}</p>
        ) : (
          <WeightForm
            key={selected}
            date={selected}
            entry={selectedEntry}
            onDateChange={setSelected}
            onSave={save}
            onDelete={onDelete}
          />
        )}
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

      <p className="mt-8 font-mono text-2xs text-ink-faint">
        {t('pages.weight.averageNote', { days: AVERAGE_WINDOW_DAYS })}
      </p>
    </>
  )
}

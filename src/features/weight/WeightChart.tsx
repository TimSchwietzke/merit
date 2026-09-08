import { useTranslation } from 'react-i18next'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { EmptyState } from '@/components/EmptyState'
import { formatDayShort, formatNumber } from '@/lib/format'
import { AVERAGE_WINDOW_DAYS, weightDomain, type WeightPoint } from '@/lib/weight'

/**
 * Weight over time: the raw daily values and the seven-day rolling average as
 * two series (GOAL.md §5). Recharts, rendering SVG — a diagram is DOM here, not
 * canvas (DESIGN.md §11).
 *
 * The two series differ in stroke as well as in colour: raw is a 1px line with
 * half-opacity dots, the average is 2px and solid. A reader with a red-green
 * deficiency, and a greyscale printout, both still see two lines.
 *
 * Colour comes from `--merit-chart-*`, the scoped palette §2.4 allows only
 * inside a chart component. They are referenced as CSS variables rather than
 * read through `getComputedStyle`, so the chart repaints with the theme instead
 * of keeping the colours it was mounted with.
 */
const RAW = 'var(--merit-chart-4)'
const AVERAGE = 'var(--merit-chart-5)'
const AXIS = 'var(--merit-line-strong)'
const LABEL = 'var(--merit-ink-faint)'

const tick = { fill: LABEL, fontSize: 12, fontFamily: 'var(--font-mono)' }

export function WeightChart({ points, locale }: { points: WeightPoint[]; locale: string }) {
  const { t } = useTranslation()
  const domain = weightDomain(points)
  const logged = points.filter((point) => point.weightKg !== null)

  // Not a spinner and not an empty frame: the state names the action (§11).
  if (!domain || logged.length === 0) {
    return <EmptyState>{t('pages.weight.chart.empty')}</EmptyState>
  }

  const first = logged[0]
  const last = logged[logged.length - 1]

  return (
    <figure className="m-0">
      <div
        role="img"
        aria-label={t('pages.weight.chart.aria', {
          entries: logged.length,
          from: formatDayShort(first.date, locale),
          to: formatDayShort(last.date, locale),
          low: formatNumber(domain[0], locale),
          high: formatNumber(domain[1], locale),
        })}
        className="h-[200px] w-full md:h-[260px]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={AXIS} strokeOpacity={0.5} vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(value: string) => formatDayShort(value, locale)}
              tick={tick}
              tickLine={false}
              axisLine={{ stroke: AXIS }}
              // At 375px a tick per day is a smear. Recharts drops ticks until
              // they are 44px apart rather than shrinking the type (§8).
              minTickGap={44}
              interval="preserveStartEnd"
            />
            {/* The unit is named once in the section head — `trend · kg` — and
                not repeated on five ticks: 64px of axis is a fifth of a 375px
                screen, and §11 asks for a labelled axis, not a loud one. */}
            <YAxis
              // Never zero-based: a 2kg move inside an 80kg number is the whole
              // signal, and a zero baseline flattens it to nothing (§11).
              domain={domain}
              tickFormatter={(value: number) => formatNumber(value, locale, 1)}
              tick={tick}
              tickLine={false}
              axisLine={false}
              width={46}
            />
            {/* Tap to pin, tap elsewhere to dismiss. A hover-only tooltip is
                unreachable on the primary target device (§11, §17). */}
            <Tooltip
              trigger="click"
              cursor={{ stroke: AXIS }}
              content={<WeightTooltip locale={locale} />}
            />
            {/* connectNulls stays off on both: a fortnight without a weigh-in
                must look like a fortnight without a weigh-in (§11). */}
            <Line
              type="linear"
              dataKey="weightKg"
              stroke={RAW}
              strokeWidth={1}
              dot={{ r: 2, fill: RAW, stroke: RAW, opacity: 0.5 }}
              activeDot={{ r: 3.5, fill: RAW, stroke: RAW }}
              connectNulls={false}
              isAnimationActive={false}
              name={t('pages.weight.chart.raw')}
            />
            <Line
              type="linear"
              dataKey="averageKg"
              stroke={AVERAGE}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3.5, fill: AVERAGE, stroke: AVERAGE }}
              connectNulls={false}
              isAnimationActive={false}
              name={t('pages.weight.chart.average', { days: AVERAGE_WINDOW_DAYS })}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Merit's own legend rather than Recharts': the swatches carry the stroke
          difference, which is the part that survives without colour. */}
      <figcaption className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-2xs text-ink-faint">
        <span className="flex items-center gap-2">
          <svg width="18" height="6" aria-hidden className="shrink-0">
            <line x1="0" y1="3" x2="18" y2="3" stroke={RAW} strokeWidth="1" />
            <circle cx="9" cy="3" r="2" fill={RAW} opacity="0.5" />
          </svg>
          {t('pages.weight.chart.raw')}
        </span>
        <span className="flex items-center gap-2">
          <svg width="18" height="6" aria-hidden className="shrink-0">
            <line x1="0" y1="3" x2="18" y2="3" stroke={AVERAGE} strokeWidth="2" />
          </svg>
          {t('pages.weight.chart.average', { days: AVERAGE_WINDOW_DAYS })}
        </span>
      </figcaption>

      {/* The figures behind the picture. A chart is `role="img"` with a summary;
          the values themselves still have to be readable (§11). */}
      <table className="sr-only">
        <caption>{t('pages.weight.chart.tableCaption')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('pages.weight.chart.columnDay')}</th>
            <th scope="col">{t('pages.weight.chart.columnWeight')}</th>
            <th scope="col">{t('pages.weight.chart.average', { days: AVERAGE_WINDOW_DAYS })}</th>
          </tr>
        </thead>
        <tbody>
          {logged.map((point) => (
            <tr key={point.date}>
              <th scope="row">{formatDayShort(point.date, locale)}</th>
              <td>{point.weightKg === null ? '' : `${formatNumber(point.weightKg, locale)} kg`}</td>
              <td>{point.averageKg === null ? '' : `${formatNumber(point.averageKg, locale)} kg`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

interface TooltipEntry {
  dataKey?: string | number
  value?: number | null
}

/** The pinned reading. Both series at that day, or the one that has a value. */
function WeightTooltip({
  active,
  payload,
  label,
  locale,
}: {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string
  locale: string
}) {
  const { t } = useTranslation()
  if (!active || !payload?.length || !label) return null

  const value = (key: string) =>
    payload.find((entry) => entry.dataKey === key)?.value ?? null

  const raw = value('weightKg')
  const average = value('averageKg')

  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2 shadow-lg">
      <p className="font-mono text-2xs text-ink-faint">{formatDayShort(label, locale)}</p>
      {raw !== null ? (
        <p className="mt-1 font-mono text-sm tabular-nums text-ink">
          {formatNumber(raw, locale)} kg
        </p>
      ) : null}
      {average !== null ? (
        <p className="font-mono text-2xs text-ink-faint">
          {t('pages.weight.chart.average', { days: AVERAGE_WINDOW_DAYS })}{' '}
          <span className="text-ink">{formatNumber(average, locale)}</span> kg
        </p>
      ) : null}
    </div>
  )
}

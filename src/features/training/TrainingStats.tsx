import { useTranslation } from 'react-i18next'

import { Panel } from '@/components/Panel'
import { StatCard } from '@/components/StatCard'
import { Streak } from '@/components/Streak'
import { formatNumber } from '@/lib/format'
import { plannedWeeks, trend, weeklyVolume } from '@/lib/progress'
import type { PlannedRoutine } from '@/lib/schedule'
import { weekCells, weeklyStreak } from '@/lib/streak'
import type { SessionSets } from '@/lib/training'

/**
 * What the last eight weeks of training look like, as two readings side by
 * side (GOAL.md §2.1).
 *
 * The training screen had no answer to "is anything moving" — the reason
 * anybody opens this tab on a rest day. Two cards answer it: how much was
 * lifted, and how often. A number at full size with its shape underneath, which
 * is the arrangement an instrument uses when the value matters more than the
 * curve but the curve is why you believe the value.
 *
 * The charts have no axes, no gridlines and no tooltip. At 165px wide those are
 * illegible ornament; the figure above carries the value and the shape carries
 * the direction. The full series with its axes belongs on a screen of its own.
 */
export function TrainingStats({
  history,
  routines,
  today,
  locale,
}: {
  history: SessionSets[]
  routines: PlannedRoutine[]
  today: string
  locale: string
}) {
  const { t } = useTranslation()
  const points = weeklyVolume(history, today, 8)
  const latest = points[points.length - 1]
  const weeks = plannedWeeks(history, routines, today, 12)

  // Nothing logged in two months is not a chart, it is a fact about the
  // account. §10.8: say so in the space it would occupy.
  if (points.every((point) => point.volumeKg === 0)) return null

  const change = trend(points)
  const streak = weeklyStreak(weeks, today)

  return (
    <section className="mt-6 grid grid-cols-2 gap-3">
      <StatCard
        id="stat-volume"
        label={t('pages.training.stats.volume')}
        value={formatNumber(latest.volumeKg / 1000, locale, 1)}
        unit="t"
        // A change against the weeks before it, said as a number rather than
        // coloured green or red: §17 forbids a traffic-light scale on a figure,
        // and a light week is not a failure.
        note={
          change === null
            ? undefined
            : t('pages.training.stats.against', {
                change: `${change > 0 ? '+' : ''}${formatNumber(change * 100, locale, 0)}`,
              })
        }
        points={points}
        series="volumeKg"
      />
      <StatCard
        id="stat-sessions"
        label={t('pages.training.stats.sessions')}
        value={String(latest.sessions)}
        unit={t('pages.training.stats.perWeek')}
        note={t('pages.training.stats.weeks', { count: points.length })}
        points={points}
        series="sessions"
      />

      {/* Full width beneath the pair: a run of weeks is a long shape, and
          squeezed into half the column the cells would be narrower than the
          gaps between them.

          Only once there is a run. A `0` under twelve empty cells is the app
          opening with a reproach, which is the thing a streak here is not
          allowed to be. */}
      {streak > 0 ? (
        <Panel className="col-span-2 p-4">
          <Streak
            label={t('common.streak.training')}
            count={streak}
            cells={weekCells(weeks, today, 12)}
            caption={t('common.streak.weeks', { count: streak })}
          />
        </Panel>
      ) : null}
    </section>
  )
}

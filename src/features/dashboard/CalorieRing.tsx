import { useTranslation } from 'react-i18next'

import { formatNumber } from '@/lib/format'
import { progress } from '@/lib/goals'

/**
 * A sum against a target is a ring, not a bar (DESIGN.md §10.10).
 *
 * It starts at twelve o'clock and runs clockwise. Past the target it keeps
 * going into a second lap in `danger` drawn over the first, with the 100%
 * position marked by a 2px gap in the page colour so the overshoot stays
 * measurable rather than just red.
 *
 * The centre carries the remaining figure, and the ring is `role="img"` with
 * the same numbers in its label — a ring is unreadable to a screen reader
 * otherwise.
 */
const SIZE = 168
const STROKE = 8
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function CalorieRing({
  total,
  target,
  locale,
}: {
  total: number
  target: number
  locale: string
}) {
  const { t } = useTranslation()
  const { fraction, over, overshoot } = progress(total, target)

  // A second lap only ever shows the part past the target; more than one lap
  // over is capped, because at that point the number is the story.
  const second = Math.min(1, overshoot)

  return (
    <div className="flex flex-col items-center">
      <div
        role="img"
        aria-label={t('pages.dashboard.ringAria', {
          total: formatNumber(total, locale, 0),
          target: formatNumber(target, locale, 0),
          remaining: formatNumber(Math.abs(over), locale, 0),
        })}
        className="relative"
        style={{ width: SIZE, height: SIZE }}
      >
        <svg width={SIZE} height={SIZE} aria-hidden className="-rotate-90">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            className="stroke-line"
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="butt"
            strokeDasharray={`${fraction * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            className="stroke-accent"
          />
          {second > 0 ? (
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              strokeWidth={STROKE}
              strokeLinecap="butt"
              strokeDasharray={`${second * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              className="stroke-danger"
            />
          ) : null}
        </svg>

        {/* The 100% mark, left standing under the second lap. Without it "over"
            is a colour rather than a measurement. */}
        {second > 0 ? (
          <span
            aria-hidden
            className="absolute left-1/2 top-0 h-2 w-0.5 -translate-x-1/2 bg-bg"
          />
        ) : null}

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-3xl tabular-nums text-ink">
            {formatNumber(Math.abs(over), locale, 0)}
          </span>
          <span className="mt-1 font-mono text-2xs text-ink-faint">
            {t(over > 0 ? 'pages.dashboard.over' : 'pages.dashboard.left')}
          </span>
        </div>
      </div>

      <p className="mt-3 font-mono text-2xs text-ink-faint">
        <span className="text-ink">{formatNumber(total, locale, 0)}</span> /{' '}
        {formatNumber(target, locale, 0)} kcal
      </p>
    </div>
  )
}

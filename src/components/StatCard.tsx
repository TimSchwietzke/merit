import type { ReactNode } from 'react'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'

import { Panel } from '@/components/Panel'

/**
 * One reading: a label, the figure at full size, its shape, and a line of
 * context under it.
 *
 * The arrangement an instrument uses when the value matters more than the curve
 * but the curve is why you believe the value. The chart has no axes, no
 * gridlines and no tooltip. At 165px wide those are illegible ornament, and
 * the full series with its axes belongs on a screen of its own.
 *
 * The colour is `accent`, so the card is oxide on training, moss on nutrition
 * and steel on weight without being told which.
 */
export function StatCard({
  label,
  value,
  unit,
  note,
  points,
  series,
  id,
  children,
}: {
  label: string
  value: string
  unit?: string
  note?: ReactNode
  /** Omit both `points` and `children` for a card that is only a figure.
   *  `unknown[]` rather than an index signature: every caller passes a real
   *  shaped type, and demanding `Record<string, unknown>` would make each of
   *  them widen a good type to satisfy a chart library. */
  points?: readonly unknown[]
  /** The key on `points` to plot. */
  series?: string
  /** Unique per card: two gradients sharing an id means the second chart
   *  paints with the first one's fill. */
  id?: string
  children?: ReactNode
}) {
  return (
    <Panel className="flex flex-col gap-3 p-4">
      <p className="font-mono text-2xs text-ink-faint">{label}</p>

      <p className="font-mono tabular-nums leading-none">
        <span className="text-3xl font-medium text-ink">{value}</span>
        {unit ? <span className="ml-1 text-2xs text-ink-faint">{unit}</span> : null}
      </p>

      {points && series && id ? (
        // `aria-hidden`: the figure above already says everything this shape
        // says, and a screen reader reading eight unlabelled numbers is worse
        // than silence.
        <div aria-hidden className="-mx-1 h-12">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={points as object[]}
              margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--merit-accent)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--merit-accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey={series}
                stroke="var(--merit-accent)"
                strokeWidth={2}
                fill={`url(#${id})`}
                isAnimationActive={false}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      {children}

      {note ? <p className="font-mono text-2xs text-ink-faint">{note}</p> : null}
    </Panel>
  )
}

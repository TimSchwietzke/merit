import { progress } from '@/lib/goals'

/**
 * A total against a target (DESIGN.md §10.9).
 *
 * A 3px track in `line` with an `accent` fill, and beneath it a mono line with
 * the one significant number promoted out of `ink-faint` into `ink`.
 *
 * Exceeding the target has to be obvious at a glance, so the bar does not stop
 * at 100%: past the target it keeps filling in `danger` from the target mark
 * rightwards, with a 1px tick left standing at the 100% position so the
 * overshoot is measurable rather than just red.
 *
 * Undershooting is the same mechanism and deliberately quieter — the bar simply
 * is not full. A day in progress is not a failed day, and this screen is looked
 * at mid-afternoon more often than at midnight.
 *
 * The fill sweeps in once when the bar mounts. It is the only self-running
 * motion Merit has and it is deliberately on this component: a bar is a
 * measurement, and watching it stop somewhere says more about where the day
 * stands than finding it already stopped.
 */
export function Progress({
  total,
  target,
  label,
  ariaLabel,
}: {
  total: number
  target: number
  /** The line beneath, already formatted. Omitted where the row around the bar
   *  already carries the figures — the nutrient panel, for one. */
  label?: React.ReactNode
  ariaLabel: string
}) {
  const { fraction, overshoot } = progress(total, target)
  // The overshoot shares the bar with the target, so 100% of the target takes
  // proportionally less of the width the further past it the day goes.
  const scale = 1 + overshoot
  const fill = (fraction / scale) * 100
  const over = (overshoot / scale) * 100

  return (
    <div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={Math.round(total)}
        aria-label={ariaLabel}
        className="relative h-[3px] w-full overflow-hidden rounded-full bg-line"
      >
        {/* The one authored moment on a screen (§13): the bar arrives at its
            value rather than being found already there. Scale, not width, so it
            is a compositor job; once, on mount, never again. */}
        <div
          className="merit-sweep absolute inset-y-0 left-0 bg-accent"
          style={{ width: `${fill}%` }}
        />
        {over > 0 ? (
          <>
            <div
              className="absolute inset-y-0 bg-danger"
              style={{ left: `${fill}%`, width: `${over}%` }}
            />
            {/* The target mark stays visible under the overshoot, or "over" is
                a colour rather than a measurement. */}
            <div
              aria-hidden
              className="absolute inset-y-0 w-px bg-line-strong"
              style={{ left: `${fill}%` }}
            />
          </>
        ) : null}
      </div>

      {label ? <p className="mt-2 font-mono text-2xs text-ink-faint">{label}</p> : null}
    </div>
  )
}

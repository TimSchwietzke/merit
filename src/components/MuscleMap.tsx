import { BACK, FRONT, OUTLINE, SILHOUETTE, VIEW_BOX } from '@/components/muscle-paths'

/**
 * A body with the muscles an exercise works filled in.
 *
 * This is the exercise illustration. Not a photograph of somebody in a gym —
 * 876 of those would be a different app bolted onto this one, and the catalogue
 * would be fixed while the design was broken. A silhouette drawn from our own
 * tokens is always present, always consistent, needs no licence to comply with,
 * and answers the question somebody actually scans a catalogue for: what does
 * this work.
 *
 * Three fills, told apart by density rather than by hue, the same rule the
 * mosaic and the week strip follow: `accent` for a primary muscle, the accent
 * at 45% for a secondary, `surface-2` for everything else. The body's own
 * contour is a stroke in `line-strong`, and the parts that are not muscles at
 * all — head, hands, feet — stay silhouette. The colour arrives through
 * `accent`, so the map is oxide inside training and steel inside weight without
 * being told which.
 *
 * `role="img"` with the muscles named: a screen reader gets the sentence the
 * picture is making, because an SVG of ninety paths is otherwise silence.
 */
export function MuscleMap({
  primary,
  secondary = [],
  label,
  className = '',
}: {
  /** Slugs from `muscle-paths` — `chest`, `triceps`, `upper-back`. */
  primary: readonly string[]
  secondary?: readonly string[]
  label: string
  className?: string
}) {
  const first = new Set(primary)
  const second = new Set(secondary)

  const fill = (slug: string) => {
    if (SILHOUETTE.has(slug)) return 'var(--merit-surface-2)'
    if (first.has(slug)) return 'var(--merit-accent)'
    if (second.has(slug)) return 'color-mix(in oklab, var(--merit-accent) 45%, transparent)'
    return 'var(--merit-surface-2)'
  }

  return (
    <div role="img" aria-label={label} className={`flex justify-center gap-1 ${className}`}>
      {(['front', 'back'] as const).map((side) => (
        <svg
          key={side}
          viewBox={VIEW_BOX[side]}
          // No fixed height: the caller decides how big a body is, and the two
          // halves share whatever it gives them.
          className="h-full w-auto max-w-[50%]"
          aria-hidden
        >
          <path
            d={OUTLINE[side]}
            fill="none"
            stroke="var(--merit-line-strong)"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
          {Object.entries(side === 'front' ? FRONT : BACK).map(([slug, paths]) =>
            paths.map((d, index) => <path key={`${slug}-${index}`} d={d} fill={fill(slug)} />),
          )}
        </svg>
      ))}
    </div>
  )
}

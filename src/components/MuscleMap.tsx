import { BACK, FRONT, OUTLINE, SILHOUETTE, VIEW_BOX } from '@/components/muscle-paths'

/**
 * A body with regions lit to whatever degree the caller asks for.
 *
 * Two screens want this and they want different things from it. An exercise
 * wants two states — what it works and what it helps with. The dashboard wants
 * a continuous one — how long ago each part was trained, brightest today and
 * dark after a week. So the component takes an intensity per region rather than
 * a category, and both callers describe themselves in the same vocabulary.
 *
 * The light is one hue at varying strength, never a second colour: the accent
 * mixed into `surface-2` by however much the caller asked for. That is the same
 * fill-density rule the mosaic and the week strip follow, and it is why the map
 * still reads in greyscale and to a red-green deficiency. Colour arrives
 * through `accent`, so the body is oxide inside training and moss on the
 * dashboard without being told which.
 *
 * Regions that are not muscles at all — head, hands, feet — stay silhouette
 * whatever is passed for them.
 *
 * `role="img"` with a written label: an SVG of ninety paths is otherwise
 * silence, and the sentence is the part worth hearing.
 */
export function MuscleMap({
  regions,
  label,
  className = '',
  reveal = false,
}: {
  /** Slug → 0..1. Anything absent is unlit. */
  regions: Readonly<Record<string, number>>
  label: string
  className?: string
  /** Light the regions on mount instead of finding them already lit (§13). */
  reveal?: boolean
}) {
  // Unlit is `line`, not `surface-2`: on the near-black ground a plane-coloured
  // body reads as a shadow of one. `line` is the structural neutral and it is
  // the point at which a shape becomes a body you can see before anything on it
  // has lit up.
  const fill = (slug: string) => {
    const lit = SILHOUETTE.has(slug) ? 0 : Math.max(0, Math.min(1, regions[slug] ?? 0))
    if (lit === 0) return 'var(--merit-line)'
    return `color-mix(in oklab, var(--merit-accent) ${Math.round(lit * 100)}%, var(--merit-line))`
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
            paths.map((d, index) => (
              <path
                key={`${slug}-${index}`}
                d={d}
                fill={fill(slug)}
                // A reading arriving rather than one already there — the same
                // authored moment a bar makes, on a shape instead of a length.
                // Once, on mount; `prefers-reduced-motion` lands it on the end
                // state in the first frame.
                className={reveal ? 'merit-light' : undefined}
              />
            )),
          )}
        </svg>
      ))}
    </div>
  )
}

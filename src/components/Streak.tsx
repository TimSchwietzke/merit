/**
 * A consistency mark: what the count is, and the run behind it (DESIGN.md
 * §10.10).
 *
 * The mosaic is the house motif — hard-edged cells, 2px apart, filled in
 * `accent` where the period was met and `line` where it was not. Told apart by
 * fill, not by hue, so it survives a greyscale printout and a red-green
 * deficiency; the domain's own colour arrives through `accent` and needs no
 * argument here.
 *
 * **What this deliberately is not:** a flame, a badge, a countdown, or anything
 * that changes when the run is about to end. The number states what happened.
 * It does not lean on anybody about tomorrow, which is the difference between a
 * record and a demand (PRODUCT.md).
 */
export function Streak({
  label,
  count,
  cells,
  caption,
}: {
  /** Mono, lowercase: `dran geblieben`, `wochen nach plan`. */
  label: string
  count: number
  /** Oldest first; the most recent period is the rightmost cell. */
  cells: boolean[]
  /** The unit, already pluralised — `12 Tage`, `3 Wochen`. */
  caption: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-2xs text-ink-faint">{label}</p>

      <p className="font-mono tabular-nums leading-none">
        <span className="text-3xl font-medium text-ink">{count}</span>
        <span className="ml-1.5 text-2xs text-ink-faint">{caption}</span>
      </p>

      {/* One `role="img"` with the whole run in its label: sixteen unlabelled
          cells read out one at a time is worse than the sentence they add up
          to. */}
      <div
        role="img"
        aria-label={`${caption} — ${label}`}
        className="flex items-end gap-[2px]"
      >
        {cells.map((met, index) => (
          <span
            key={index}
            className={`h-4 flex-1 rounded-sm ${met ? 'bg-accent' : 'bg-line'}`}
          />
        ))}
      </div>
    </div>
  )
}

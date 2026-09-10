/**
 * The mosaic at card scale: one hard-edged cell per period, filled in `accent`
 * where it was met and `line` where it was not (DESIGN.md §10.10).
 *
 * Told apart by fill rather than hue, so it survives a greyscale printout and a
 * red-green deficiency. `aria-hidden` because the figure it sits under already
 * says the number; a screen reader counting twenty-eight cells one at a time is
 * worse than silence.
 */
export function Cells({ cells }: { cells: boolean[] }) {
  return (
    <span aria-hidden className="flex items-end gap-[2px]">
      {cells.map((met, index) => (
        <span key={index} className={`h-3 flex-1 rounded-sm ${met ? 'bg-accent' : 'bg-line'}`} />
      ))}
    </span>
  )
}

import { cn } from '@/lib/utils'

/**
 * The 2–4 way exclusive choice: theme, meal type, chart range (DESIGN.md §10.7).
 * One bordered container at radius 5 with `overflow: hidden`; the children are
 * flush, with the active segment carrying `accent-soft` + `accent`.
 *
 * Built from plain buttons rather than on a Radix primitive, which is a
 * deviation from §3.3 and deliberate: §10.7 specifies `role="group"` with each
 * button `aria-pressed`, and neither candidate produces that. Radix `Tabs` is
 * `tablist`/`tab` and expects panels this control does not have; Radix
 * `ToggleGroup type="single"` is `radiogroup`/`radio` with `aria-checked`. The
 * behaviour worth importing from shadcn is focus traps and portals (CLAUDE.md);
 * three buttons and an `aria-pressed` are not that.
 *
 * Above four options this becomes a `select` — at 375px a five-segment control
 * gives 60px segments.
 */
export interface Segment<T extends string> {
  value: T
  label: string
}

export function SegmentedControl<T extends string>({
  label,
  value,
  segments,
  onChange,
  disabled = false,
}: {
  /** Names the group for a screen reader; the control has no visible legend. */
  label: string
  value: T
  segments: readonly Segment<T>[]
  onChange: (value: T) => void
  disabled?: boolean
}) {
  return (
    <div
      role="group"
      aria-label={label}
      // `divide-x` rather than a border on each child: the container draws the
      // dividers, the same way Rows does. Without them two inactive segments
      // sitting side by side are one undifferentiated block.
      className="inline-flex divide-x divide-line overflow-hidden rounded-md border border-line"
    >
      {segments.map((segment) => {
        const active = segment.value === value
        return (
          <button
            key={segment.value}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onChange(segment.value)}
            className={cn(
              `min-h-11 px-3.5 py-2.5 text-sm transition-colors [transition-duration:140ms]
               md:min-h-[30px] md:px-2.5 md:py-1.5 disabled:opacity-35`,
              active
                ? 'bg-accent-soft font-medium text-accent'
                : 'text-ink-faint hover:bg-surface hover:text-ink',
            )}
          >
            {segment.label}
          </button>
        )
      })}
    </div>
  )
}

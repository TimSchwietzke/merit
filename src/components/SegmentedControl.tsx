import { ToggleGroup } from 'radix-ui'

import { cn } from '@/lib/utils'

/**
 * The 2–4 way exclusive choice: theme, meal type, chart range (DESIGN.md §10.7).
 * One bordered container at radius 5 with `overflow: hidden`; the children are
 * flush, with the active segment carrying `accent-soft` + `accent`.
 *
 * Built on Radix `ToggleGroup type="single"`, which renders `role="radiogroup"`
 * with `role="radio"` + `aria-checked` on each option, and gives arrow-key
 * roving focus for free. That is the point of taking the primitive at all:
 * the exclusivity is announced ("2 of 3") rather than left for the user to
 * infer from three independent toggle buttons.
 *
 * Above four options this becomes a `select`: at 375px a five-segment control
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
    <ToggleGroup.Root
      type="single"
      value={value}
      // Radix reports '' when the active option is pressed again. A segmented
      // control has no empty state, there is always a theme, so that is
      // swallowed rather than passed on as a change.
      onValueChange={(next) => {
        if (next) onChange(next as T)
      }}
      aria-label={label}
      disabled={disabled}
      // `divide-x` rather than a border on each child: the container draws the
      // dividers, the same way Rows does. Without them two inactive segments
      // sitting side by side are one undifferentiated block.
      className="inline-flex divide-x divide-line overflow-hidden rounded-md border border-line"
    >
      {segments.map((segment) => (
        <ToggleGroup.Item
          key={segment.value}
          value={segment.value}
          className={cn(
            `min-h-11 px-3.5 py-2.5 text-sm transition-colors [transition-duration:140ms]
             active:[transition-duration:0ms] md:min-h-[30px] md:px-2.5 md:py-1.5
             disabled:opacity-35`,
            // Keyed off data-state in both directions rather than a base style
            // plus a hover override, so the active segment does not lose its
            // fill on hover depending on which rule Tailwind emits last.
            // There is no hover on touch, so the press state is the only
            // feedback a tap gets (§6). It is never transitioned.
            `data-[state=off]:text-ink-faint data-[state=off]:hover:bg-surface
             data-[state=off]:hover:text-ink data-[state=off]:active:bg-surface-2
             data-[state=off]:active:text-ink`,
            `data-[state=on]:bg-accent-soft data-[state=on]:font-medium data-[state=on]:text-accent`,
          )}
        >
          {segment.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  )
}

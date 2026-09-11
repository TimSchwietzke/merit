import { SegmentedControl } from '@/components/SegmentedControl'

/**
 * A mono label above a segmented control, for a profile field that may not
 * have an answer yet.
 *
 * The control itself has no empty state (DESIGN.md §10.7), so an unset field
 * keeps `value` outside the option set rather than inventing a selection: the
 * first option showing as chosen would be the app answering a question about
 * the user on their behalf.
 */
export function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T | null
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="flex flex-col items-start gap-2">
      <p className="font-mono text-2xs text-ink-faint">{label}</p>
      <SegmentedControl<T>
        label={label}
        value={value ?? ('' as T)}
        onChange={onChange}
        segments={options}
      />
    </div>
  )
}

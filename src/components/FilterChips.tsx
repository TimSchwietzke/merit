import { useTranslation } from 'react-i18next'

/**
 * A facet of a list, as pressable chips (DESIGN.md §10.11).
 *
 * §10.6's chip made interactive: `surface-2` at rest, `accent-soft` when on.
 * Several can be on at once — that is the difference from a segmented control
 * and the reason §10.7's "above four options it becomes a select" does not
 * apply. A select would hide the options until tapped, allow one, and hide the
 * current state behind a closed control.
 *
 * Options with nothing behind them are not rendered. A catalogue of thirty
 * lifts uses six of the eight equipment types, and a chip that can only ever
 * return an empty list is a dead control taking up a phone screen.
 */
export interface FilterOption {
  value: string
  label: string
}

export function FilterChips({
  label,
  options,
  active,
  onChange,
}: {
  /** Names the facet for a screen reader; the row has no visible legend. */
  label: string
  options: FilterOption[]
  active: string[]
  onChange: (active: string[]) => void
}) {
  const { t } = useTranslation()
  if (options.length === 0) return null

  const toggle = (value: string) =>
    onChange(active.includes(value) ? active.filter((v) => v !== value) : [...active, value])

  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const on = active.includes(option.value)
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(option.value)}
            className={`inline-flex min-h-11 items-center rounded-md border px-3.5 font-mono text-2xs
                        transition-colors [transition-duration:140ms] active:[transition-duration:0ms]
                        ${
                          on
                            ? 'border-accent bg-accent-soft text-accent'
                            : 'border-line bg-surface-2 text-ink-muted active:bg-surface'
                        }`}
          >
            {option.label}
          </button>
        )
      })}

      {/* Only while something is filtered. A permanently disabled control is a
          dead target on a screen that has none to spare (§10.11). */}
      {active.length > 0 ? (
        <button
          type="button"
          onClick={() => onChange([])}
          className="inline-flex min-h-11 items-center px-2 font-mono text-2xs text-accent
                     underline decoration-1 underline-offset-2"
        >
          {t('common.clearFilters')}
        </button>
      ) : null}
    </div>
  )
}

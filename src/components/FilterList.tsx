import { Check } from 'lucide-react'

import { Rows } from '@/components/Rows'
import { SectionHead } from '@/components/SectionHead'

/**
 * One facet of a filter, as a column of rows (DESIGN.md §10.11).
 *
 * A chip row exists to survive on a crowded screen. Inside a sheet nothing is
 * crowded, and the trade a chip makes, short label, wrapped into a block,
 * several per line, buys nothing and costs the scannability a column has. So
 * each option is a row at the list height, with its state on the left where a
 * column of them reads down.
 *
 * Options with nothing behind them are not rendered: a filter that can only
 * ever return an empty list is a dead control.
 */
export interface FilterOption {
  value: string
  label: string
  /** How many rows this option would leave. Zero means it is not offered. */
  count: number
}

export function FilterList({
  label,
  options,
  active,
  onChange,
}: {
  label: string
  options: FilterOption[]
  active: string[]
  onChange: (active: string[]) => void
}) {
  const offered = options.filter((option) => option.count > 0)
  if (offered.length === 0) return null

  const toggle = (value: string) =>
    onChange(active.includes(value) ? active.filter((v) => v !== value) : [...active, value])

  return (
    <section className="mb-6 last:mb-0">
      <SectionHead label={label} />
      <Rows>
        {offered.map((option) => {
          const on = active.includes(option.value)
          return (
            <li key={option.value}>
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggle(option.value)}
                className="flex min-h-[52px] w-full items-center gap-3 px-4 py-3 text-left
                           transition-colors hover:bg-surface-2 active:bg-surface-2
                           [transition-duration:140ms] active:[transition-duration:0ms]"
              >
                <span
                  aria-hidden
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border
                              ${on ? 'border-accent bg-accent text-bg' : 'border-line-strong text-transparent'}`}
                >
                  <Check size={13} strokeWidth={2.5} />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{option.label}</span>
                <span className="shrink-0 font-mono text-2xs tabular-nums text-ink-faint">
                  {option.count}
                </span>
              </button>
            </li>
          )
        })}
      </Rows>
    </section>
  )
}

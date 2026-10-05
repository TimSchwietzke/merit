import type { ComponentProps, ReactNode } from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/**
 * The number field, Merit's most-used control (DESIGN.md §10.5). A weight, a
 * portion, a rep count: mono tabular figures, right-aligned, with the unit as a
 * static `ink-faint` suffix inside the field rather than as a second label.
 *
 * Never `type="number"`. It brings spinner arrows nobody can hit at 375px and
 * it rejects the comma half of Europe writes a decimal with (§8), so the field
 * is text with `inputMode` and the parsing is `parseDecimalInput`'s job.
 */
export function NumberField({
  id,
  label,
  unit,
  hint,
  error,
  className,
  ...props
}: Omit<ComponentProps<'input'>, 'type'> & {
  id: string
  label: string
  /** Rendered inside the field, right-aligned: `kg`, `%`, `g`. Empty when the label already says it. */
  unit: string
  hint?: ReactNode
  /** Named under the field when the value cannot be read. */
  error?: string
}) {
  const errorId = `${id}-error`
  const unitId = `${id}-unit`

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>
        {label}
        {hint ? <span className="text-ink-faint">{hint}</span> : null}
      </Label>

      <div className="relative">
        <Input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          // The unit is described rather than hidden: it is inside the field
          // and not in the label, so hiding it leaves a screen reader asking
          // for a weight in nothing in particular.
          aria-describedby={[unit ? unitId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined}
          className={cn(
            // Reserves the unit's column so a four-digit value cannot run
            // underneath it. `md:` as well: the input's own `md:px-3` sits in
            // a media query and would otherwise win back the right padding
            // from `lg` up. Where the collision is invisible until someone
            // types four digits.
            'text-right font-mono tabular-nums',
            unit ? 'pr-12 md:pr-12' : 'pr-3.5 md:pr-3.5',
            error && 'border-danger',
            className,
          )}
          {...props}
        />
        {unit ? (
          <span
            id={unitId}
            className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center font-mono text-2xs text-ink-faint"
          >
            {unit}
          </span>
        ) : null}
      </div>

      {error ? (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}

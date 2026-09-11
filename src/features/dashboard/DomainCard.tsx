import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/**
 * One domain, reported on the one screen that reports on all of them.
 *
 * The dashboard owns no colour of its own, it is where the four meet, so each
 * card carries `data-domain` and rebinds `accent` for everything inside it
 * (`tokens.css`). Four cards, four hues, no component here knowing which.
 *
 * The whole card is the way in. A card that shows a number and then puts a
 * separate link under it is asking twice for the same tap.
 */
export function DomainCard({
  domain,
  to,
  label,
  value,
  unit,
  note,
  children,
}: {
  /** Omitted for nutrition, which is moss, the default `accent`. */
  domain?: 'training' | 'weight' | 'cardio'
  to: string
  label: string
  /** The one figure this card exists to show. Absent while it is unknown. */
  value?: string
  unit?: string
  note?: string
  children?: ReactNode
}) {
  return (
    <Link
      to={to}
      data-domain={domain}
      // `h-full`: inside the carousel every card is as tall as the tallest, and
      // a short one that does not fill its slot makes the peek look broken.
      // No border: the fill alone is enough separation on this ground, and a
      // hairline around each of four cards is what turns a strip into a row of
      // boxes. The corner is the container radius the whole app uses, though,
      // because a 22px filled rectangle with nothing drawn on it is the shape
      // every generated interface ships.
      className="flex h-full flex-col gap-3 rounded-lg bg-surface p-5 transition-colors
                 [transition-duration:140ms] hover:bg-surface-2 active:bg-surface-2
                 active:[transition-duration:0ms]"
    >
      <p className="flex items-center justify-between gap-2 font-mono text-2xs text-ink-faint">
        {label}
        <span aria-hidden className="text-accent">
          →
        </span>
      </p>

      {value !== undefined ? (
        <p className="font-mono tabular-nums leading-none">
          <span className="text-3xl font-medium text-ink">{value}</span>
          {unit ? <span className="ml-1 text-2xs text-ink-faint">{unit}</span> : null}
        </p>
      ) : null}

      {children}

      {note ? <p className="font-mono text-2xs text-ink-muted">{note}</p> : null}
    </Link>
  )
}

import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/** A list rendered as bordered rows rather than a grid of cards.
 *  Rows are 52px minimum on touch — see DESIGN.md §5.2. */
export function Rows({ children }: { children: ReactNode }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
      {children}
    </ul>
  )
}

const ROW = `flex min-h-[52px] w-full items-center gap-3 px-4 py-3 text-left
             transition-colors hover:bg-surface-2 active:bg-surface-2
             [transition-duration:140ms] active:[transition-duration:0ms]`

/** A row that navigates is a link and a row that acts is a button — a link has
 *  to survive a middle click and announce itself as one. */
export function Row({
  children,
  onClick,
  to,
}: {
  children: ReactNode
  onClick?: () => void
  to?: string
}) {
  return (
    <li>
      {to ? (
        <Link to={to} className={ROW}>
          {children}
        </Link>
      ) : (
        <button type="button" onClick={onClick} className={ROW}>
          {children}
        </button>
      )}
    </li>
  )
}

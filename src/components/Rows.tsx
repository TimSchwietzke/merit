import type { ReactNode } from 'react'

/** A list rendered as bordered rows rather than a grid of cards.
 *  Rows are 52px minimum on touch — see DESIGN.md §5.2. */
export function Rows({ children }: { children: ReactNode }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
      {children}
    </ul>
  )
}

export function Row({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-[52px] w-full items-center gap-3 px-4 py-3 text-left
                   transition-colors hover:bg-surface-2 active:bg-surface-2
                   [transition-duration:140ms] active:[transition-duration:0ms]"
      >
        {children}
      </button>
    </li>
  )
}

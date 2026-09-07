import type { ReactNode } from 'react'

/** A bordered region. Borders define structure here — shadows are for overlays only.
 *  Used instead of shadcn's Card, which ships a shadow. */
export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-line bg-surface ${className}`}>{children}</div>
}

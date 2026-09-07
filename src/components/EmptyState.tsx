import type { ReactNode } from 'react'

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-line bg-surface px-4 py-6 text-center text-sm text-ink-muted">
      {children}
    </p>
  )
}

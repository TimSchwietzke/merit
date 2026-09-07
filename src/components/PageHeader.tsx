import type { ReactNode } from 'react'

export function PageHeader({ title, lead }: { title: string; lead?: ReactNode }) {
  return (
    <header className="mb-6 md:mb-8">
      <h1 className="text-xl font-semibold tracking-tight text-balance">{title}</h1>
      {lead ? <p className="mt-2 max-w-[68ch] text-ink-muted">{lead}</p> : null}
    </header>
  )
}

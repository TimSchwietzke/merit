import type { ReactNode } from 'react'

/** The muted twin of the accent edge: something provisional or not yet built.
 *  A mono label naming the milestone, one sentence saying what will go there.
 *  See DESIGN.md §10.8. */
export function NotBuiltYet({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-l-2 border-line-strong py-1 pl-4">
      <p className="font-mono text-2xs text-ink-faint">{label}</p>
      <p className="mt-2 max-w-[68ch] text-ink-muted">{children}</p>
    </div>
  )
}

import type { ReactNode } from 'react'

/** Small mono label used above groups of content. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="font-mono text-2xs text-ink-faint">{children}</p>
}

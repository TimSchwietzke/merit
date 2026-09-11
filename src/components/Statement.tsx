import type { ReactNode } from 'react'

/** The accent edge, the one piece of pure voice. In Merit it carries the
 *  dashboard's single sentence about the day. Two per screen cancel out. */
export function Statement({ children }: { children: ReactNode }) {
  return (
    <div className="border-l-2 border-accent py-1 pl-4">
      <p className="max-w-[62ch] font-serif text-lg leading-snug">{children}</p>
    </div>
  )
}

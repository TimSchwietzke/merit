import type { ReactNode } from 'react'

/**
 * One row inside a Panel (DESIGN.md §10.2): a mono `text-2xs` label in
 * `ink-faint`, the value 8px below at `text-sm`, and a `border-top` suppressed
 * on the first. Stacked Fields make a metadata rail without a shadow or a
 * heading anywhere in it.
 */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-t border-line px-4 py-3.5 first:border-t-0 md:py-3">
      <p className="font-mono text-2xs text-ink-faint">{label}</p>
      <div className="mt-2 text-sm">{children}</div>
    </div>
  )
}

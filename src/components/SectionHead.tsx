import type { ReactNode } from 'react'

export function SectionHead({ label, hint }: { label: string; hint?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4 border-b border-line pb-2">
      <h2 className="font-mono text-2xs tracking-wide text-ink-faint">{label}</h2>
      {/* A div, not a span: the hint carries the range control on the weight
          screen, and a ToggleGroup renders a div. */}
      {hint ? <div className="font-mono text-2xs text-ink-faint">{hint}</div> : null}
    </div>
  )
}

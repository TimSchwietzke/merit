import type { ReactNode } from 'react'
import { Collapsible as Primitive } from 'radix-ui'
import { ChevronDown } from 'lucide-react'

/**
 * A group that can be folded away (DESIGN.md §10.11).
 *
 * Radix for the wiring (`aria-expanded`, `aria-controls`, the id pairing) and
 * for `--radix-collapsible-content-height`, which is what makes the height
 * animation possible at all: the panel's natural height is not a number CSS can
 * interpolate from `auto`, and Radix measures it. §13 permits height here and
 * nowhere else, and every other route to it (`interpolate-size`, `calc-size()`)
 * is Chromium-only, which is no use on the phones this runs on.
 *
 * It opens expanded and stays that way unless somebody folds it. Content
 * collapsed by default is the anti-pattern (§17); this is the control that was
 * being confused with it.
 */
export function Collapsible({
  label,
  count,
  open,
  onOpenChange,
  children,
}: {
  label: string
  /** How many rows are inside, so a folded group still says whether to open it. */
  count: number
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  return (
    <Primitive.Root open={open} onOpenChange={onOpenChange}>
      {/* §10.3's section head, made pressable: baseline-aligned, a rule beneath,
          the count on the right where the optional action would sit. */}
      <Primitive.Trigger
        className="group mb-3 flex w-full min-h-11 items-baseline justify-between gap-4
                   border-b border-line pb-2 text-left"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <ChevronDown
            aria-hidden
            size={13}
            strokeWidth={2}
            className="shrink-0 text-ink-faint transition-transform duration-150
                       group-data-[state=closed]:-rotate-90"
          />
          <span className="truncate font-mono text-2xs tracking-wide text-ink-faint">{label}</span>
        </span>
        <span className="shrink-0 font-mono text-2xs text-ink-faint">{count}</span>
      </Primitive.Trigger>

      <Primitive.Content
        className="overflow-hidden
                   data-[state=closed]:animate-collapse-up
                   data-[state=open]:animate-collapse-down"
      >
        <div className="pb-6">{children}</div>
      </Primitive.Content>
    </Primitive.Root>
  )
}

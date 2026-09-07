import type * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'

/**
 * shadcn's `button`, with its variant set replaced by Merit's four
 * (DESIGN.md §10.4) and its sizes replaced by the §5.2 recipes. shadcn's own
 * variants are deleted rather than left unused, per §3.2.
 *
 * Gone from the shadcn original, deliberately:
 *   - `ring-3` focus — Merit's focus ring is a 2px accent outline defined once
 *     globally in index.css (§16.2).
 *   - `rounded-lg` (6px) — buttons sit at radius 5 (`rounded-md`).
 *   - `h-8` / `h-9` — every touch target is at least 44px (§5.2).
 *   - `active:translate-y-px` — motion is feedback, not decoration (§13).
 */
const buttonVariants = cva(
  `inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-transparent
   font-medium whitespace-normal text-sm transition-colors [transition-duration:140ms] outline-none
   select-none disabled:pointer-events-none disabled:opacity-35
   [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4`,
  {
    variants: {
      variant: {
        // One per screen at most.
        primary: 'bg-accent text-bg hover:opacity-90',
        // The important-but-not-only action. Hover inverts.
        tinted: 'border-accent bg-accent-soft text-accent hover:bg-accent hover:text-bg',
        quiet: 'border-line text-ink hover:border-line-strong',
        bare: 'text-ink-muted hover:bg-surface hover:text-ink',
      },
      size: {
        // 12px 18px / min-h 44 on touch, 8px 14px / min-h 36 from md up.
        default: 'min-h-11 px-[18px] py-3 md:min-h-9 md:px-[14px] md:py-2',
        small: 'min-h-11 px-3.5 py-2.5 md:min-h-[30px] md:px-2.5 md:py-1.5',
        icon: 'min-h-11 min-w-11 p-3 md:min-h-8 md:min-w-8 md:p-2',
      },
    },
    defaultVariants: {
      variant: 'quiet',
      size: 'default',
    },
  },
)

export function Button({
  className,
  variant = 'quiet',
  size = 'default',
  asChild = false,
  pending = false,
  disabled,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** A button that writes to the database is disabled while the write is in
     *  flight — on a phone connection the gap is long enough to tap twice
     *  (DESIGN.md §10.4). */
    pending?: boolean
  }) {
  const Comp = asChild ? Slot.Root : 'button'

  return (
    <Comp
      data-slot="button"
      aria-busy={pending || undefined}
      disabled={disabled || pending}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

// `buttonVariants` stays module-local: nothing styles a non-button as a button
// yet, and exporting it alongside the component breaks fast refresh.

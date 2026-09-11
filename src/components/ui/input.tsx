import type * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * shadcn's `input`, restyled per DESIGN.md §10.5.
 *
 * `text-input` (16px) below `md` is not a preference: iOS zooms a focused
 * input under 16px, and `user-scalable=no` is an anti-pattern (§17). Gone from
 * the original: the `ring-3` focus and the `outline-none` that came with it
 * (Merit's ring is the global 2px accent outline in index.css, §16.2, and
 * `outline-none` sits in the `utilities` layer, so it was overriding that
 * `base` rule and leaving the field with no focus indicator at all), plus
 * `h-8` and `rounded-lg`.
 */
export function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        `min-h-11 w-full min-w-0 rounded-md border border-line bg-surface px-3.5 py-3
         text-input text-ink transition-colors [transition-duration:140ms]
         placeholder:text-ink-faint focus-visible:border-accent
         disabled:cursor-not-allowed disabled:opacity-35
         md:min-h-9 md:px-3 md:py-2 md:text-sm`,
        className,
      )}
      {...props}
    />
  )
}

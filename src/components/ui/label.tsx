import type * as React from 'react'
import { Label as LabelPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

/**
 * shadcn's `label` over the Radix primitive — kept for the `htmlFor`/click
 * wiring — restyled to Merit's label: mono `text-2xs` in `ink-faint`, never
 * uppercase with wide tracking (DESIGN.md §10.6, §17).
 */
export function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        `flex items-center gap-2 font-mono text-2xs text-ink-faint select-none
         peer-disabled:opacity-35`,
        className,
      )}
      {...props}
    />
  )
}

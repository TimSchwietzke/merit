import type { ReactNode } from 'react'
import { Dialog } from 'radix-ui'

import { Button } from '@/components/ui/button'

/**
 * One question and two answers. A bottom sheet below `md`, a centred dialog
 * above (§8), on Radix `Dialog` for the focus trap and the dismiss handling.
 *
 * Used where an action rearranges something the user cannot see all of, a swap
 * moves two days at once, and the sentence names both so nobody has to infer
 * what they just agreed to.
 */
export function Confirm({
  open,
  onOpenChange,
  question,
  confirmLabel,
  cancelLabel,
  onConfirm,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  question: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  /** Anything the question needs beneath it. */
  children?: ReactNode
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-[2px]" />
        <Dialog.Content
          className="fixed inset-x-0 bottom-0 z-50 rounded-t-[14px] border-t border-line bg-surface
                     px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5 shadow-lg
                     md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-[400px]
                     md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[14px] md:border md:pb-6"
        >
          <Dialog.Title className="max-w-[46ch] text-ink">{question}</Dialog.Title>
          {children}
          <div className="mt-6 flex flex-col gap-3 md:flex-row-reverse md:justify-start">
            <Button
              variant="primary"
              onClick={() => {
                onConfirm()
                onOpenChange(false)
              }}
            >
              {confirmLabel}
            </Button>
            <Dialog.Close asChild>
              <Button variant="quiet">{cancelLabel}</Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

import type { ReactNode } from 'react'
import { Dialog } from 'radix-ui'
import { X } from 'lucide-react'

/**
 * A bottom sheet below `md`, a centred dialog from `md` up — one wrapper so
 * call sites do not branch (DESIGN.md §8).
 *
 * Written on Radix `Dialog` rather than taken from shadcn: the behaviour worth
 * having is the focus trap, the dismiss handling and the portal, and shadcn's
 * own look would be stripped on arrival anyway (§3.2). A true overlay is one of
 * the few things §6 allows a shadow.
 *
 * 14px radius on the top corners: §6's larger surface radius, because a
 * full-width sheet with 6px corners reads as a page that failed to load.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  closeLabel,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  closeLabel: string
  children: ReactNode
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-[2px]" />

        <Dialog.Content
          className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-[14px]
                     border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] shadow-lg
                     md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-[420px]
                     md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[14px] md:border"
        >
          {/* The drag handle is one of exactly two things §6 lets go fully
              round. It is decoration for the eye, not a control. */}
          <div aria-hidden className="flex justify-center pt-2 md:hidden">
            <span className="h-1 w-9 rounded-full bg-line-strong" />
          </div>

          <div className="flex items-center justify-between gap-4 px-4 pb-2 pt-3">
            <Dialog.Title className="font-mono text-2xs tracking-wide text-ink-faint">
              {title}
            </Dialog.Title>
            <Dialog.Close
              aria-label={closeLabel}
              className="-mr-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md
                         text-ink-muted transition-colors [transition-duration:140ms]
                         hover:bg-surface-2 hover:text-ink active:bg-surface-2"
            >
              <X size={16} strokeWidth={1.75} aria-hidden />
            </Dialog.Close>
          </div>

          <div className="px-4 pb-6">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

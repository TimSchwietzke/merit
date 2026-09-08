import type { CSSProperties } from 'react'
import { Toaster as Sonner } from 'sonner'

/**
 * The toast layer. sonner is used for exactly one thing (DESIGN.md §3.3: "use
 * sparingly. Merit prefers in-place state to notifications"): the undo that has
 * to follow every deletion (§14). Nothing else in Merit toasts — a failed save
 * is a line under the field that failed, not a notification.
 *
 * `unstyled` per §3.2: sonner's own look is a white rounded-xl card with a
 * shadow and its own type scale, none of which is Merit's. The classes below
 * are the whole appearance. The shadow survives because a toast is a true
 * overlay — the one place §6 allows one.
 */
/** The 56px tab bar, the home indicator, a gutter, and the toast's own height. */
const OVER_TAB_BAR =
  'calc(56px + 1rem + var(--front-toast-height, 62px) + env(safe-area-inset-bottom))'

export function Toaster() {
  return (
    <Sonner
      position="bottom-center"
      duration={5000}
      // The offset anchors the top of the toast, and sonner publishes the
      // height it ended up with, so the bar is cleared without guessing at how
      // many lines the message wrapped to.
      offset={{ bottom: OVER_TAB_BAR }}
      mobileOffset={{ bottom: OVER_TAB_BAR, left: '1rem', right: '1rem' }}
      // sonner's surface, border and radius come from these four variables, so
      // the house tokens are handed over rather than fought with. `unstyled`
      // would take its positioning with its look — the toast then lays out from
      // the top of a zero-height container and lands under the tab bar.
      style={
        {
          '--normal-bg': 'var(--merit-surface)',
          '--normal-text': 'var(--merit-ink)',
          '--normal-border': 'var(--merit-line)',
          '--border-radius': '5px',
          '--font-mono': 'var(--font-mono)',
        } as CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'font-sans text-sm',
          actionButton: `!bg-transparent !px-3 font-mono !text-2xs !text-accent underline
                         decoration-1 underline-offset-2`,
        },
      }}
    />
  )
}

import { useRef, useState, type PointerEvent, type ReactNode } from 'react'

/**
 * A row whose destructive action lives behind a swipe (DESIGN.md §10.1).
 *
 * A delete control sitting 8px from a value in a 52px row gets hit by accident,
 * and a plain tap that deletes is worse still — it makes every mis-tap
 * destructive. So the row itself does the non-destructive thing, and the
 * dangerous one costs a deliberate sideways drag.
 *
 * Dragging either way opens it, and the actions appear on the side the row came
 * from. Which direction "means" delete is a convention people hold strongly and
 * differently; supporting both costs one conditional and settles the argument.
 *
 * Keyboard and screen-reader users never see the gesture, so the actions behind
 * it must never be the only route to what they do. Here the row itself is a
 * link to the screen that also carries a delete button.
 */

/** Wide enough for a 44px target and its padding (§5.2). */
const ACTION_WIDTH = 96

/** Past this the row latches open instead of springing back. */
const LATCH = 40

/** Below this a drag is the page scrolling, not a swipe on the row. */
const SLOP = 8

export function SwipeRow({
  children,
  actions,
  open,
  onOpenChange,
  label,
}: {
  children: ReactNode
  /** Revealed behind the row. Rendered only while it is open or moving. */
  actions: ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Names the gesture for anybody who cannot perform it. */
  label: string
}) {
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const start = useRef<{ x: number; y: number; from: number } | null>(null)
  // Set once a drag is unambiguously horizontal, so a scroll that begins over a
  // row keeps scrolling the page.
  const axis = useRef<'undecided' | 'horizontal' | 'vertical'>('undecided')

  const resting = open ? ACTION_WIDTH : 0
  const shown = dragging ? offset : resting

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    // Mouse and touch only; a stylus hover would start a phantom drag.
    if (event.pointerType === 'mouse' && event.button !== 0) return
    start.current = { x: event.clientX, y: event.clientY, from: resting }
    axis.current = 'undecided'
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const from = start.current
    if (!from) return

    const dx = event.clientX - from.x
    const dy = event.clientY - from.y

    if (axis.current === 'undecided') {
      if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return
      axis.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical'
      if (axis.current === 'horizontal') {
        setDragging(true)
        try {
          event.currentTarget.setPointerCapture(event.pointerId)
        } catch {
          // Some synthesised pointers cannot be captured. The drag still works
          // from the events that keep arriving; it just ends early if the
          // finger leaves the row.
        }
      }
    }
    if (axis.current !== 'horizontal') return

    // Clamped to the panel's width in both directions: a row that slides off
    // the screen is a row you cannot get back.
    const next = Math.max(-ACTION_WIDTH, Math.min(ACTION_WIDTH, from.from + dx))
    setOffset(next)
  }

  function onPointerUp() {
    if (axis.current === 'horizontal') onOpenChange(Math.abs(offset) > LATCH)
    start.current = null
    axis.current = 'undecided'
    setDragging(false)
  }

  const side = shown === 0 ? (open ? 1 : 0) : Math.sign(shown)

  return (
    <li className="relative overflow-hidden">
      {/* Only present while it can be reached, so nothing tabs into an
          invisible delete button. */}
      {open || dragging ? (
        <div
          className={`absolute inset-y-0 flex items-stretch ${side < 0 ? 'right-0' : 'left-0'}`}
          style={{ width: ACTION_WIDTH }}
        >
          {actions}
        </div>
      ) : null}

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        // `pan-y` leaves vertical scrolling to the browser and claims the
        // horizontal axis, so the page does not scroll under a swipe on touch.
        style={{ transform: `translateX(${shown}px)`, touchAction: 'pan-y' }}
        // 200ms ease-out is §13's row-removal figure; the same movement
        // reversed. Never transitioned while the finger is down, or the row
        // lags behind it.
        className={`relative bg-surface ${dragging ? '' : 'transition-transform duration-200 ease-out'}`}
      >
        {children}
      </div>

      <span className="sr-only">{label}</span>
    </li>
  )
}

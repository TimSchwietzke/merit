import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'

/**
 * A row whose destructive action lives behind a swipe (DESIGN.md §10.1).
 *
 * A delete control sitting 8px from a value in a 52px row gets hit by accident,
 * and a plain tap that deletes is worse still — it makes every mis-tap
 * destructive. So the row itself does the non-destructive thing, and the
 * dangerous one costs a deliberate sideways drag.
 *
 * The drag is written straight to the element rather than through state. React
 * re-rendering the row on every `pointermove` — 120 times a second on a phone —
 * is what a swipe feels like when it feels wrong: the row arrives a frame or
 * two behind the finger and the whole gesture reads as sticky. State is touched
 * once, on release.
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

/** Or past this, however short the drag. A flick is an intention too. */
const FLICK = 0.4

/** Below this a drag is the page scrolling, not a swipe on the row. */
const SLOP = 8

/** §13: row removal is 200ms ease-out. This is that movement, reversed. */
const SETTLE = 'transform 200ms ease-out'

export function SwipeRow({
  children,
  actions,
  open,
  onOpenChange,
  label,
}: {
  children: ReactNode
  actions: ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Names the gesture for anybody who cannot perform it. */
  label: string
}) {
  const contentRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  /** Which side the actions sit on. Only read while the row is open. */
  const [side, setSide] = useState<1 | -1>(1)
  /** The panel is mounted from the moment of contact, so nothing mounts mid-drag. */
  const [pressed, setPressed] = useState(false)

  const drag = useRef<{ x: number; y: number; from: number; lastX: number; at: number } | null>(null)
  const axis = useRef<'undecided' | 'horizontal' | 'vertical'>('undecided')
  const offset = useRef(0)

  function place(x: number, settle: boolean) {
    offset.current = x
    const el = contentRef.current
    if (!el) return
    el.style.transition = settle ? SETTLE : 'none'
    el.style.transform = `translateX(${x}px)`
    if (panelRef.current) panelRef.current.style.justifyContent = x < 0 ? 'flex-end' : 'flex-start'
  }

  // Follows the row being closed from outside — which is how opening one row
  // closes the last.
  useEffect(() => {
    if (!drag.current) place(open ? ACTION_WIDTH * side : 0, true)
  }, [open, side])

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      from: offset.current,
      lastX: event.clientX,
      at: event.timeStamp,
    }
    axis.current = 'undecided'
    setPressed(true)
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const from = drag.current
    if (!from) return

    const dx = event.clientX - from.x
    const dy = event.clientY - from.y

    if (axis.current === 'undecided') {
      if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return
      axis.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical'
      if (axis.current === 'horizontal') {
        try {
          event.currentTarget.setPointerCapture(event.pointerId)
        } catch {
          // Some synthesised pointers cannot be captured; the drag still works
          // from the events that keep arriving.
        }
      }
    }
    if (axis.current !== 'horizontal') return

    from.lastX = event.clientX
    from.at = event.timeStamp
    place(resist(from.from + dx), false)
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const from = drag.current
    drag.current = null
    setPressed(false)
    if (!from || axis.current !== 'horizontal') return

    const elapsed = Math.max(1, event.timeStamp - from.at)
    const velocity = (event.clientX - from.lastX) / elapsed
    const x = offset.current
    const flicked = Math.abs(velocity) > FLICK && Math.sign(velocity) === Math.sign(x)
    const next = Math.abs(x) > LATCH || flicked

    if (x !== 0) setSide(x < 0 ? -1 : 1)
    place(next ? ACTION_WIDTH * (x < 0 ? -1 : 1) : 0, true)
    onOpenChange(next)
  }

  return (
    <li className="relative overflow-hidden">
      {open || pressed ? (
        <div ref={panelRef} className="absolute inset-0 flex items-stretch">
          <div className="flex" style={{ width: ACTION_WIDTH }}>
            {actions}
          </div>
        </div>
      ) : null}

      <div
        ref={contentRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        // `pan-y` leaves vertical scrolling to the browser and claims the
        // horizontal axis, so the page does not slide under a swipe. The layer
        // hint keeps the transform off the main thread.
        style={{ touchAction: 'pan-y', willChange: 'transform' }}
        className="relative bg-surface"
      >
        {children}
      </div>

      <span className="sr-only">{label}</span>
    </li>
  )
}

/**
 * Past the panel's width the row keeps moving, but a quarter as far. A hard
 * stop at the clamp feels like the gesture broke; giving a little and pulling
 * back is what tells a thumb it has reached the end.
 */
function resist(x: number): number {
  const over = Math.abs(x) - ACTION_WIDTH
  if (over <= 0) return x
  return Math.sign(x) * (ACTION_WIDTH + over * 0.25)
}

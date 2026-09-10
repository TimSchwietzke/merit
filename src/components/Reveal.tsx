import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * A block that arrives from one side the first time it is scrolled to.
 *
 * Once, per block, on the way in — never again, and never on the way back up.
 * The point is that a screen assembles itself as you move down it rather than
 * being fully drawn behind the fold; repeating it on every pass would turn a
 * flourish into a fidget.
 *
 * `IntersectionObserver` rather than a scroll handler: the browser does the
 * measuring off the main thread, and a scroll listener recomputing four
 * bounding boxes per frame is exactly the kind of thing that makes a phone feel
 * cheap. The observer disconnects the moment it has fired.
 *
 * It fails visible, not blank. If the observer is missing the content is shown
 * immediately, because a decorative entrance is never worth risking the thing
 * it decorates.
 */
export function Reveal({
  from,
  className = '',
  children,
}: {
  from: 'left' | 'right'
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setShown(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setShown(true)
        observer.disconnect()
      },
      // A tenth of the viewport in from the bottom: a block should start moving
      // as it clears the edge, not once it is already sitting in the middle.
      { rootMargin: '0px 0px -10% 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      // `h-full` so a wrapper inside a grid does not stop its card filling the
      // cell it was given.
      className={`h-full ${className} ${shown ? (from === 'left' ? 'merit-from-left' : 'merit-from-right') : 'opacity-0'}`}
    >
      {children}
    </div>
  )
}

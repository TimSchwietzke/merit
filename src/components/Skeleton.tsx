/**
 * A block standing where content is about to be.
 *
 * The point is the *shape*, not the notice. Every loading state used to be one
 * mono line saying `wird geladen` where a whole screen was about to arrive, so
 * the page jumped the moment it did, which is the flicker. A placeholder that
 * occupies roughly the room the real thing will occupy has nothing to jump
 * from.
 *
 * **It does not shimmer.** A sweeping gradient is a loop, and §13 allows one
 * self-running moment per screen and gives it to a measurement arriving.
 * Motion is also not what a skeleton is for: it is holding a space, and a
 * static plane does that without asking to be watched. What tells somebody the
 * app is working is that the layout is already there.
 *
 * `aria-hidden`, and the region around it carries `aria-busy`: a screen reader
 * should hear that something is loading once, not hear eleven empty boxes.
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return <span aria-hidden className={`block rounded-md bg-surface-2 ${className}`} />
}

/**
 * The wrapper a screen's skeleton goes in, so the fact of loading is announced
 * once rather than per block.
 */
export function Loading({
  label,
  className = '',
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div role="status" aria-busy aria-label={label} className={className}>
      {children}
    </div>
  )
}

/** The week strip's footprint: a range line over seven tiles. */
export function StripSkeleton() {
  return (
    <div className="rounded-lg bg-surface p-2">
      <Skeleton className="mx-auto h-4 w-24" />
      <div className="-mx-1 mt-2 flex gap-0.5">
        {Array.from({ length: 7 }, (_, index) => (
          <Skeleton key={index} className="h-14 flex-1" />
        ))}
      </div>
    </div>
  )
}

/** A `Rows` list before its rows: the container, and n rows of its height. */
export function RowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex min-h-[52px] items-center px-4 py-3">
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  )
}

/**
 * The shape of *a* screen, for the moment before we know which one.
 *
 * The lazy-route fallback cannot know what is coming, so it holds the one thing
 * every screen here starts with: a heading and a first block. Deliberately
 * unlabelled, it is on screen for a frame or two and announcing it would be
 * noisier than the wait.
 */
export function RouteSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-40 rounded-lg" />
      <Skeleton className="h-24 rounded-lg" />
    </div>
  )
}

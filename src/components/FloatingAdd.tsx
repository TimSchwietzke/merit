import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'

import { useActiveSession } from '@/features/training/useActiveSession'

/**
 * Adding to the list a screen is about, floating over it (DESIGN.md §10.10).
 *
 * One target in the corner the thumb is already at, on every screen whose list
 * grows: routines and the food day. Weight has its form on the page instead,
 * and a button that only leads back to it would be the same action twice.
 *
 * It is hidden while a session is running: the set you are on owns the bottom
 * of the screen then, and two floating things fighting for that corner is how
 * the wrong one gets tapped between sets. The list beneath carries the bottom
 * padding (`pb-16`) to clear it.
 *
 * Square with a 5px radius, not a circle, §6 allows a pill for a progress
 * track and a sheet's drag handle, and nothing else. §6 does allow the shadow:
 * this genuinely floats, which is the same licence the session bar has.
 */
export function FloatingAdd({
  label,
  to,
  onClick,
}: {
  label: string
  to?: string
  onClick?: () => void | Promise<void>
}) {
  const { running } = useActiveSession()
  const [pending, setPending] = useState(false)

  if (running) return null

  const className = `fixed bottom-[calc(56px+0.75rem+env(safe-area-inset-bottom))] right-4 z-30 flex
    h-14 w-14 items-center justify-center rounded-md bg-accent text-bg shadow-lg
    transition-opacity [transition-duration:140ms] hover:opacity-90
    active:opacity-90 active:[transition-duration:0ms] disabled:opacity-35 lg:bottom-4`
  const icon = <Plus size={22} strokeWidth={2} aria-hidden />

  if (to) {
    return (
      <Link to={to} aria-label={label} className={className}>
        {icon}
      </Link>
    )
  }

  return (
    <button
      type="button"
      aria-label={label}
      disabled={pending}
      onClick={async () => {
        setPending(true)
        await onClick?.()
        setPending(false)
      }}
      className={className}
    >
      {icon}
    </button>
  )
}

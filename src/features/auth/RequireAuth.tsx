import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useSession } from '@/features/auth/useSession'

/**
 * The gate in front of every signed-in route.
 *
 * While the session is still being read it renders nothing rather than a
 * spinner: the wait is a few milliseconds off `localStorage`, and a spinner
 * that appears and vanishes on every reload reads as a fault (DESIGN.md §17).
 */
export function RequireAuth() {
  const { status } = useSession()
  const location = useLocation()

  if (status === 'loading') return null

  if (status === 'signedOut') {
    // Remember where they were headed so signing in lands there, not on the
    // dashboard. A deep link from a bookmark should survive the detour.
    return <Navigate to="/sign-in" replace state={{ from: location.pathname + location.search }} />
  }

  return <Outlet />
}

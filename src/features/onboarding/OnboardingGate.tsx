import { Navigate, Outlet } from 'react-router-dom'

import { useOnboarded } from '@/features/onboarding/useOnboarding'

/**
 * A first sign-in goes to the walkthrough rather than to an empty dashboard
 * (GOAL.md §2.1.1).
 *
 * It stands between consent and the app the same way the consent gate stands
 * between signing in and consent, and for the same reason: it is a question
 * asked before there is a screen, not a screen of the app.
 *
 * Nothing rather than a spinner while the answer is read, and it fails *open*.
 * A profile query that does not come back must never be what keeps somebody
 * out of their own logs; the worst case of letting them through is an empty
 * dashboard, which is what the walkthrough exists to improve, not to enforce.
 */
export function OnboardingGate() {
  const { status, onboarded } = useOnboarded()

  if (status === 'loading') return null
  if (status === 'ready' && !onboarded) return <Navigate to="/welcome" replace />
  return <Outlet />
}

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'

import { supabase } from '@/lib/supabase'
import { SessionContext, type SessionState } from '@/features/auth/useSession'

/**
 * Holds the auth session for the whole app. One subscription, one source of
 * truth — `onAuthStateChange` also fires on token refresh and on sign-out in
 * another tab, so nothing else needs to poll.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true

    // Reading the stored session touches the network only if the access token
    // has expired, so this settles immediately in the common case.
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setReady(true)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return
      setSession(next)
      setReady(true)
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<SessionState>(
    () => ({
      status: !ready ? 'loading' : session ? 'signedIn' : 'signedOut',
      session,
    }),
    [ready, session],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

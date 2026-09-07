import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'

export interface SessionState {
  /** `loading` until the stored session has been read once. Routing decisions
   *  wait for it, or every reload flashes the sign-in screen. */
  status: 'loading' | 'signedIn' | 'signedOut'
  session: Session | null
}

export const SessionContext = createContext<SessionState | null>(null)

export function useSession(): SessionState {
  const state = useContext(SessionContext)
  if (!state) throw new Error('useSession must be used inside <SessionProvider>.')
  return state
}

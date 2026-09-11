import { useCallback, useEffect, useState } from 'react'

import { useSession } from '@/features/auth/useSession'
import { PRIVACY_VERSION } from '@/features/legal/version'
import { db } from '@/lib/offline/db'
import { supabase } from '@/lib/supabase'

/**
 * Whether this account has given explicit Art. 9(2)(a) consent, and to which
 * version of the notice.
 *
 * Consent to an older version does not carry: a notice that changed materially
 * describes a different processing, and Art. 7 wants consent to *that*. So the
 * gate compares versions rather than checking a boolean, and a change asks
 * again instead of assuming.
 *
 * The answer is also noted on the device, because a phone in a gym basement
 * cannot read the profile and the gate would otherwise put up a wall whose
 * only button needs the network the phone has not got. The note is keyed by
 * account *and* by version, so it can only ever answer the same question the
 * server was going to answer: it never says yes to a person who has not said
 * yes, or to a notice they have not seen.
 */
export interface Consent {
  status: 'loading' | 'given' | 'needed' | 'error'
  give: () => Promise<boolean>
}

/** Which account agreed to which notice. Never just "yes". */
const stamp = (userId: string) => `${userId}:${PRIVACY_VERSION}`

export function useConsent(): Consent {
  const { session } = useSession()
  const userId = session?.user.id
  const [status, setStatus] = useState<Consent['status']>('loading')

  useEffect(() => {
    if (!userId) return
    let active = true

    void supabase
      .from('profiles')
      .select('consent_at, consent_version')
      .eq('user_id', userId)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (error) {
          // Unreadable is not the same as unanswered.
          const noted = await db.meta.get('consent')
          if (!active) return
          return setStatus(noted?.value === stamp(userId) ? 'given' : 'error')
        }
        const given = Boolean(data?.consent_at) && data?.consent_version === PRIVACY_VERSION
        if (given) await db.meta.put({ key: 'consent', value: stamp(userId) })
        if (!active) return
        setStatus(given ? 'given' : 'needed')
      })

    return () => {
      active = false
    }
  }, [userId])

  const give = useCallback(async () => {
    if (!userId) return false
    // Update, not upsert: `profiles` has no insert policy on purpose — the row
    // is written by a trigger on auth.users — and PostgREST sends an upsert as
    // INSERT … ON CONFLICT, which that policy refuses before it ever reaches
    // the update. `select` so a write that matched no row is a failure here
    // rather than a consent silently recorded nowhere.
    const { data, error } = await supabase
      .from('profiles')
      .update({ consent_at: new Date().toISOString(), consent_version: PRIVACY_VERSION })
      .eq('user_id', userId)
      .select('user_id')
    if (error || data.length === 0) return false
    await db.meta.put({ key: 'consent', value: stamp(userId) })
    setStatus('given')
    return true
  }, [userId])

  return { status, give }
}

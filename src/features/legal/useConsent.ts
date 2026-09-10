import { useCallback, useEffect, useState } from 'react'

import { useSession } from '@/features/auth/useSession'
import { PRIVACY_VERSION } from '@/features/legal/version'
import { supabase } from '@/lib/supabase'

/**
 * Whether this account has given explicit Art. 9(2)(a) consent, and to which
 * version of the notice.
 *
 * Consent to an older version does not carry: a notice that changed materially
 * describes a different processing, and Art. 7 wants consent to *that*. So the
 * gate compares versions rather than checking a boolean, and a change asks
 * again instead of assuming.
 */
export interface Consent {
  status: 'loading' | 'given' | 'needed' | 'error'
  give: () => Promise<boolean>
}

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
      .then(({ data, error }) => {
        if (!active) return
        if (error) return setStatus('error')
        setStatus(
          data?.consent_at && data.consent_version === PRIVACY_VERSION ? 'given' : 'needed',
        )
      })

    return () => {
      active = false
    }
  }, [userId])

  const give = useCallback(async () => {
    if (!userId) return false
    // Upsert: an invited account may not have had a profile row written yet,
    // and the consent must not be lost to that.
    const { error } = await supabase
      .from('profiles')
      .upsert(
        { user_id: userId, consent_at: new Date().toISOString(), consent_version: PRIVACY_VERSION },
        { onConflict: 'user_id' },
      )
    if (error) return false
    setStatus('given')
    return true
  }, [userId])

  return { status, give }
}

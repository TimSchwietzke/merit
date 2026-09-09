import { useCallback, useEffect, useState } from 'react'

import { useSession } from '@/features/auth/useSession'
import { supabase } from '@/lib/supabase'

/**
 * The date the weekly plan is paused until, or null.
 *
 * A fortnight away is not a fortnight of missed sessions, and editing every
 * routine's weekdays before a holiday and back again afterwards is not a
 * feature, it is a chore. One date answers it.
 */
export function usePlanPause(): {
  pausedUntil: string | null
  setPausedUntil: (date: string | null) => Promise<boolean>
} {
  const { session } = useSession()
  const userId = session?.user.id
  const [pausedUntil, setValue] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    let active = true

    void supabase
      .from('profiles')
      .select('plan_paused_until')
      .eq('user_id', userId)
      .single()
      .then(({ data }) => {
        // `?? null` because a row that predates the column comes back without
        // the field at all.
        if (active && data) setValue(data.plan_paused_until ?? null)
      })

    return () => {
      active = false
    }
  }, [userId])

  const save = useCallback(
    async (date: string | null) => {
      if (!userId) return false
      const { data, error } = await supabase
        .from('profiles')
        .update({ plan_paused_until: date })
        .eq('user_id', userId)
        .select('user_id')
        .single()

      if (!data || error) return false
      setValue(date)
      return true
    },
    [userId],
  )

  return { pausedUntil, setPausedUntil: save }
}

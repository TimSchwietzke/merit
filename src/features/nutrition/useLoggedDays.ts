import { useEffect, useState } from 'react'

import { useSession } from '@/features/auth/useSession'
import { addDays } from '@/lib/date'
import { supabase } from '@/lib/supabase'

/**
 * Which days have any food logged on them, over a trailing window.
 *
 * One column and no joins: the consistency mark only needs to know whether a
 * day happened, and pulling every portion of every meal for ninety days to
 * answer a yes/no per day would be the most expensive query in the app for the
 * least information in it.
 *
 * Postgres has no `distinct` through PostgREST, so the duplicates come back and
 * the Set removes them. Ninety days of a few meals each is a few hundred short
 * rows — cheaper than the round trip it would take to avoid them.
 */
export function useLoggedDays(today: string, days = 90): Set<string> {
  const { session } = useSession()
  const userId = session?.user.id
  const [logged, setLogged] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!userId) return
    let active = true

    void supabase
      .from('food_logs')
      .select('date')
      .gte('date', addDays(today, -days))
      .lte('date', today)
      .then(({ data, error }) => {
        if (!active || error || !data) return
        setLogged(new Set(data.map((row) => row.date)))
      })

    return () => {
      active = false
    }
  }, [userId, today, days])

  return logged
}

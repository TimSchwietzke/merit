import { useCallback, useEffect, useRef, useState } from 'react'

import { useSession } from '@/features/auth/useSession'
import { supabase } from '@/lib/supabase'
import type { WeightEntry } from '@/lib/weight'

/**
 * Every weigh-in the signed-in user has, held in component state.
 *
 * No cache library and no store (GOAL.md §9). A private group logging once a
 * day produces a few hundred rows a year, so the whole table is read once and
 * the ranges are sliced from it in memory, which is also what makes the `all`
 * range and the seven-day average free rather than another round trip.
 *
 * Writes are optimistic and roll back. The screen is used standing on a scale,
 * where a spinner between the tap and the number appearing is the difference
 * between an app that feels quick and one that does not.
 */
export interface WeightLogs {
  entries: WeightEntry[]
  status: 'loading' | 'ready' | 'error'
  /** Insert or correct one day. Resolves false if the write did not land. */
  save: (entry: WeightEntry) => Promise<boolean>
  /** Remove one day. Resolves false if the row is still there. */
  remove: (date: string) => Promise<boolean>
}

const byDate = (a: WeightEntry, b: WeightEntry) => a.date.localeCompare(b.date)

export function useWeightLogs(): WeightLogs {
  const { session } = useSession()
  const userId = session?.user.id

  const [entries, setEntries] = useState<WeightEntry[]>([])
  const [status, setStatus] = useState<WeightLogs['status']>('loading')

  // The list is mirrored in a ref so a write can roll back to what was actually
  // on screen when it started. Closing over `entries` instead would capture a
  // stale list. The undo in a five-second toast is issued long after the
  // delete that created it, and would otherwise restore a list from before it.
  const entriesRef = useRef(entries)
  const apply = useCallback((next: (current: WeightEntry[]) => WeightEntry[]) => {
    entriesRef.current = next(entriesRef.current)
    setEntries(entriesRef.current)
  }, [])

  useEffect(() => {
    if (!userId) return
    let active = true

    void supabase
      .from('weight_logs')
      .select('date, weight_kg, body_fat_pct')
      .order('date')
      .then(({ data, error }) => {
        if (!active) return
        if (error || !data) {
          setStatus('error')
          return
        }
        apply(() =>
          data.map((row) => ({
            date: row.date,
            weightKg: row.weight_kg,
            bodyFatPct: row.body_fat_pct,
          })),
        )
        setStatus('ready')
      })

    return () => {
      active = false
    }
  }, [userId, apply])

  const save = useCallback(
    async (entry: WeightEntry) => {
      if (!userId) return false
      const previous = entriesRef.current

      apply((current) => [...current.filter((row) => row.date !== entry.date), entry].sort(byDate))

      // Upsert rather than insert-or-update: the primary key is (user_id, date)
      // precisely so that logging a day twice corrects it instead of producing
      // two rows the chart would have to choose between.
      //
      // `.select().single()` rather than trusting a null error. An update RLS
      // refuses matches zero rows and returns success to PostgREST, so without
      // asking for the row back a denied write is indistinguishable from a
      // saved one.
      const { data, error } = await supabase
        .from('weight_logs')
        .upsert({
          user_id: userId,
          date: entry.date,
          weight_kg: entry.weightKg,
          body_fat_pct: entry.bodyFatPct,
        })
        .select('date')
        .single()

      if (data && !error) return true
      apply(() => previous)
      return false
    },
    [apply, userId],
  )

  const remove = useCallback(
    async (date: string) => {
      if (!userId) return false
      const previous = entriesRef.current

      apply((current) => current.filter((row) => row.date !== date))

      const { data, error } = await supabase
        .from('weight_logs')
        .delete()
        .eq('user_id', userId)
        .eq('date', date)
        .select('date')
        .single()

      if (data && !error) return true
      apply(() => previous)
      return false
    },
    [apply, userId],
  )

  return { entries, status, save, remove }
}

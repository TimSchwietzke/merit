import { useEffect, useState } from 'react'

import { supabase } from '@/lib/supabase'
import {
  FOOD_SELECT,
  toCatalogueFood,
  type CatalogueFood,
  type FoodRow,
} from '@/features/nutrition/catalogue'
import type { UsdaFood } from '@/lib/usda'

/**
 * Search by name: the shared catalogue first, USDA behind it.
 *
 * This is the lookup order in GOAL.md §4 with the steps that exist so far.
 * Merit's own catalogue answers instantly and holds everything anybody has
 * scanned or typed in; FoodData Central covers the whole foods nobody scans,
 * which is the gap that made the search useless for a banana. Open Food Facts
 * has a text search too, and it is not here: it covers packaged goods, which
 * arrive by barcode already.
 *
 * Both searches hang off one debounce. The USDA call goes through an Edge
 * Function because the api.data.gov key must never reach the browser
 * (CLAUDE.md, hard rule 1); nothing about the user goes with it.
 */
export type SearchStatus = 'idle' | 'searching' | 'ready' | 'error'

/**
 * `off` is a deployment without the USDA secret: there is nothing the reader
 * could do about it and nothing to say, so the group simply is not there.
 */
export type RemoteStatus = SearchStatus | 'off' | 'rateLimited'

/** Below this a search matches most of the catalogue and helps nobody. */
const MIN_QUERY = 2
const LIMIT = 25
const DEBOUNCE = 250

export function useFoodSearch(query: string) {
  // The query the results belong to is held with them, so "too short" and
  // "still searching" are read off the current query during render rather than
  // written into state at the top of an effect.
  const [answered, setAnswered] = useState<{
    query: string
    results: CatalogueFood[]
    error: boolean
  }>({ query: '', results: [], error: false })

  const [remote, setRemote] = useState<{
    query: string
    foods: UsdaFood[]
    status: Exclude<RemoteStatus, 'idle' | 'searching'>
  }>({ query: '', foods: [], status: 'ready' })

  const trimmed = query.trim()
  const tooShort = trimmed.length < MIN_QUERY

  useEffect(() => {
    if (tooShort) return
    let active = true

    // Typing is faster than a round trip on a phone connection, so the query
    // waits for a pause rather than firing per keystroke.
    const timer = setTimeout(() => {
      void supabase
        .from('foods')
        .select(FOOD_SELECT)
        .ilike('name', `%${trimmed}%`)
        .order('name')
        .limit(LIMIT)
        .then(({ data, error }) => {
          if (!active) return
          if (error || !data) {
            setAnswered({ query: trimmed, results: [], error: true })
            return
          }
          setAnswered({
            query: trimmed,
            error: false,
            results: (data as FoodRow[]).map(toCatalogueFood),
          })
        })
    }, DEBOUNCE)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [trimmed, tooShort])

  // A second effect rather than one: the catalogue is a few milliseconds away
  // and USDA is a proxied round trip, and the near answer should not wait for
  // the far one.
  useEffect(() => {
    if (tooShort) return
    let active = true

    const timer = setTimeout(() => {
      void supabase.functions
        .invoke<{ foods?: UsdaFood[]; error?: string }>('usda', { body: { query: trimmed } })
        .then(async ({ data, error }) => {
          if (!active) return
          if (!error) {
            setRemote({ query: trimmed, foods: data?.foods ?? [], status: 'ready' })
            return
          }
          // The function answers a refusal with a status and a reason, and
          // supabase-js reports both as one error with the body attached.
          const reason =
            error instanceof Error && 'context' in error
              ? await (error.context as Response)
                  .clone()
                  .json()
                  .then((body: { error?: string }) => body.error)
                  .catch(() => undefined)
              : undefined
          if (!active) return
          setRemote({
            query: trimmed,
            foods: [],
            status:
              reason === 'not_configured' ? 'off' : reason === 'rate_limited' ? 'rateLimited' : 'error',
          })
        })
    }, DEBOUNCE)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [trimmed, tooShort])

  const answersThis = answered.query === trimmed
  const status: SearchStatus = tooShort
    ? 'idle'
    : !answersThis
      ? 'searching'
      : answered.error
        ? 'error'
        : 'ready'

  const results = status === 'ready' ? answered.results : []

  const remoteAnswersThis = remote.query === trimmed
  const remoteStatus: RemoteStatus = tooShort
    ? 'idle'
    : !remoteAnswersThis
      ? 'searching'
      : remote.status

  // What the catalogue already holds is not offered a second time from USDA:
  // the cached row is the one to log, because it carries the id the day's
  // entries point at. Matched on the FoodData Central id, and on the name for
  // rows cached before that id was kept.
  const known = new Set(results.map((food) => food.fdcId))
  const knownNames = new Set(results.map((food) => food.name.toLowerCase()))
  const usda =
    remoteStatus === 'ready'
      ? remote.foods.filter(
          (food) => !known.has(food.fdcId) && !knownNames.has(food.name.toLowerCase()),
        )
      : []

  return { results, status, usda, remoteStatus }
}

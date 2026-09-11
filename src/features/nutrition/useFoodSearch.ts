import { useEffect, useState } from 'react'

import {
  FOOD_SELECT,
  toCatalogueFood,
  type CatalogueFood,
  type FoodRow,
} from '@/features/nutrition/catalogue'
import { searchOffProducts, type OffFood } from '@/lib/off'
import { supabase } from '@/lib/supabase'
import type { UsdaFood } from '@/lib/usda'

/**
 * One search term, asked of everywhere merit knows to ask.
 *
 * The lookup order in GOAL.md §4, run at once rather than one service at a
 * time: merit's own catalogue answers instantly and holds everything anybody
 * has scanned or typed in, USDA covers the whole foods nobody scans, and Open
 * Food Facts covers the packet whose barcode will not read. Nobody asking for
 * a food should have to know which of the three has it.
 *
 * **It runs on a term that was submitted, not on one being typed.** That is
 * what makes asking all three affordable: Open Food Facts allows ten searches a
 * minute for the whole project (see `supabase/functions/off-search`), which a
 * search-per-keystroke would spend in seconds and a search-per-press never
 * will. The answer to a term is also kept for the life of the page, so
 * pressing the same search twice costs nothing.
 */
export type SearchStatus = 'idle' | 'searching' | 'ready' | 'error'

/**
 * `off` is a deployment without the USDA secret: there is nothing the reader
 * could do about it and nothing to say, so the group simply is not there.
 */
export type RemoteStatus = SearchStatus | 'off' | 'rateLimited'

export interface FoundFoods {
  /** Merit's own catalogue. */
  results: CatalogueFood[]
  status: SearchStatus
  /** FoodData Central, for whole foods. */
  usda: UsdaFood[]
  usdaStatus: RemoteStatus
  /** Open Food Facts, for packaged ones. */
  off: OffFood[]
  offStatus: RemoteStatus
}

/** Below this a search matches most of the catalogue and helps nobody. */
const MIN_QUERY = 2
/** The outside services are asked for something more specific than that. */
const MIN_REMOTE = 3
const LIMIT = 25

export function useFoodSearch(term: string): FoundFoods {
  const [answered, setAnswered] = useState<{
    term: string
    results: CatalogueFood[]
    error: boolean
  }>({ term: '', results: [], error: false })

  const [usda, setUsda] = useState<{
    term: string
    foods: UsdaFood[]
    status: Exclude<RemoteStatus, 'idle' | 'searching'>
  }>({ term: '', foods: [], status: 'ready' })

  const [off, setOff] = useState<{
    term: string
    foods: OffFood[]
    status: Exclude<RemoteStatus, 'idle' | 'searching'>
  }>({ term: '', foods: [], status: 'ready' })

  const tooShort = term.length < MIN_QUERY

  useEffect(() => {
    if (tooShort) return
    let active = true

    void supabase
      .from('foods')
      .select(FOOD_SELECT)
      .ilike('name', `%${term}%`)
      .order('name')
      .limit(LIMIT)
      .then(({ data, error }) => {
        if (!active) return
        setAnswered({
          term,
          error: Boolean(error) || !data,
          results: error || !data ? [] : (data as FoodRow[]).map(toCatalogueFood),
        })
      })

    return () => {
      active = false
    }
  }, [term, tooShort])

  // The two outside services, each in its own effect: they answer at their own
  // speeds and the catalogue, which is milliseconds away, waits for neither.
  useEffect(() => {
    if (term.length < MIN_REMOTE) return
    let active = true

    void supabase.functions
      .invoke<{ foods?: UsdaFood[]; error?: string }>('usda', { body: { query: term } })
      .then(async ({ data, error }) => {
        if (!error) {
          if (active) setUsda({ term, foods: data?.foods ?? [], status: 'ready' })
          return
        }
        const reason = await refusal(error)
        if (!active) return
        setUsda({
          term,
          foods: [],
          status:
            reason === 'not_configured' ? 'off' : reason === 'rate_limited' ? 'rateLimited' : 'error',
        })
      })

    return () => {
      active = false
    }
  }, [term])

  useEffect(() => {
    if (term.length < MIN_REMOTE) return
    let active = true

    void searchOffProducts(term).then((found) => {
      if (!active) return
      setOff({
        term,
        foods: found.kind === 'found' ? found.foods : [],
        status: found.kind === 'found' ? 'ready' : found.kind === 'busy' ? 'rateLimited' : 'error',
      })
    })

    return () => {
      active = false
    }
  }, [term])

  const status: SearchStatus = tooShort
    ? 'idle'
    : answered.term !== term
      ? 'searching'
      : answered.error
        ? 'error'
        : 'ready'

  const results = status === 'ready' ? answered.results : []

  const remote = (
    state: { term: string; status: Exclude<RemoteStatus, 'idle' | 'searching'> },
  ): RemoteStatus =>
    term.length < MIN_REMOTE ? 'idle' : state.term !== term ? 'searching' : state.status

  const usdaStatus = remote(usda)
  const offStatus = remote(off)

  // What the catalogue already holds is not offered a second time from outside:
  // the cached row is the one to log, because it carries the id the day's
  // entries point at. Matched on the id the outside service knows it by, and on
  // the name for rows cached before merit kept that id.
  const knownFdc = new Set(results.map((food) => food.fdcId))
  const knownBarcodes = new Set(results.map((food) => food.barcode))
  const knownNames = new Set(results.map((food) => food.name.toLowerCase()))

  return {
    results,
    status,
    usda:
      usdaStatus === 'ready'
        ? usda.foods.filter(
            (food) => !knownFdc.has(food.fdcId) && !knownNames.has(food.name.toLowerCase()),
          )
        : [],
    usdaStatus,
    off: offStatus === 'ready' ? off.foods.filter((food) => !knownBarcodes.has(food.barcode)) : [],
    offStatus,
  }
}

/**
 * The reason a function refused, from the body it refused with.
 *
 * supabase-js reports the status and the body as one error with the response
 * hanging off it, so the sentence the screen shows is in there rather than in
 * the message.
 */
async function refusal(error: unknown): Promise<string | undefined> {
  if (!(error instanceof Error) || !('context' in error)) return undefined
  return await (error.context as Response)
    .clone()
    .json()
    .then((body: { error?: string }) => body.error)
    .catch(() => undefined)
}

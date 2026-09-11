import { mapUsdaFood, type RawFood } from './map.ts'

/**
 * The USDA FoodData Central proxy (GOAL.md §4, step three).
 *
 * It exists for one reason: the api.data.gov key must never reach the client
 * (CLAUDE.md, hard rule 1). It lives here as a secret, the browser sends a
 * search term, and what comes back is the eight numbers Merit stores rather
 * than the few hundred kilobytes FDC answers with.
 *
 * `verify_jwt` is left on, which is the default: the quota is 1000 requests an
 * hour for the whole project, and an open proxy would be somebody else's free
 * nutrition API paid for out of merit's limit.
 *
 * Merit sends no user data here. The search term goes to api.data.gov and
 * nothing else does: no account id, no token, nothing that identifies who
 * asked. The privacy notice says so, and this is the code that has to stay
 * true to it.
 */

const SEARCH = 'https://api.nal.usda.gov/fdc/v1/foods/search'

/**
 * Whole foods only. Branded is deliberately left out: packaged products come
 * from Open Food Facts by barcode, they are per-serving shaped, and they would
 * bury the banana this search exists to find.
 */
const DATA_TYPES = 'Foundation,SR Legacy'

const MIN_QUERY = 2
const MAX_QUERY = 100
const PAGE_SIZE = 20

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  })

/**
 * The role the caller's token was issued for.
 *
 * `verify_jwt` proves the token is one of this project's and was not tampered
 * with, and stops there: the anon key is a valid token, and it ships in the
 * bundle. So the claim is read as well, because the quota this spends is the
 * whole project's and a signed-out caller has no business spending it. The
 * signature was checked at the gateway, which is why reading the payload here
 * is enough.
 */
function role(request: Request): string | null {
  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer /i, '')
  const payload = token.split('.')[1]
  if (!payload) return null
  try {
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return (JSON.parse(json) as { role?: string }).role ?? null
  } catch {
    return null
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  if (role(request) !== 'authenticated') return json({ error: 'unauthorised' }, 401)

  const key = Deno.env.get('USDA_API_KEY')
  // Names the missing piece rather than failing as a search that found nothing:
  // a deployment without its secret is a setup error, not an empty catalogue.
  if (!key) return json({ error: 'not_configured' }, 503)

  const body = await request.json().catch(() => null)
  const query = typeof body?.query === 'string' ? body.query.trim().slice(0, MAX_QUERY) : ''
  if (query.length < MIN_QUERY) return json({ foods: [] })

  const url = new URL(SEARCH)
  url.searchParams.set('api_key', key)
  url.searchParams.set('query', query)
  url.searchParams.set('dataType', DATA_TYPES)
  url.searchParams.set('pageSize', String(PAGE_SIZE))

  let response: Response
  try {
    response = await fetch(url, { headers: { accept: 'application/json' } })
  } catch {
    return json({ error: 'unreachable' }, 502)
  }

  // 429 is passed on as itself: the client can say "too many searches just now"
  // rather than "USDA is broken", which is a different sentence and a different
  // thing to do about it.
  if (!response.ok) {
    return json({ error: response.status === 429 ? 'rate_limited' : 'upstream' }, response.status === 429 ? 429 : 502)
  }

  const found = (await response.json().catch(() => null)) as { foods?: RawFood[] } | null
  const foods = (found?.foods ?? []).map(mapUsdaFood).filter((food) => food !== null)

  return json({ foods })
})

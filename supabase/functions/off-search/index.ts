/**
 * Open Food Facts text search, proxied (GOAL.md §4, step two).
 *
 * §4 says to call Open Food Facts from the browser, so that its per-IP limit
 * lands on each user rather than on one server everybody shares. That still
 * holds for the barcode lookup, which `lib/off.ts` does from the client and
 * which works. It cannot hold for the text search, for two reasons found by
 * trying it:
 *
 *   - `search.openfoodfacts.org` answers without an `Access-Control-Allow-
 *     Origin` header, so a browser will not hand the response to the page.
 *   - the older `/cgi/search.pl` answers 503, which is what their own docs
 *     warn about and what `lib/off.ts` already had a comment about.
 *
 * So it comes through here, and the per-IP limit becomes merit's limit for
 * everybody: ten searches a minute for the whole project. That is the reason
 * for the bucket below and the reason the client only asks when somebody
 * presses a button, rather than on every pause in typing like the USDA search
 * it sits next to.
 *
 * One thing is better here than in the browser: a server can set a real
 * `User-Agent`, which is what Open Food Facts asks callers to identify
 * themselves with and which a page is forbidden to send.
 */

const SEARCH = 'https://search.openfoodfacts.org/search'

/** Only what Merit stores. A hit is 320 bytes with this, and 10 kB without. */
const FIELDS = [
  'code',
  'product_name',
  'product_name_de',
  'product_name_en',
  'brands',
  'serving_size',
  'serving_quantity',
  'nutriments',
].join(',')

const IDENTITY = 'Merit/1.0 (https://github.com/TimSchwietzke/merit)'

const MIN_QUERY = 3
const MAX_QUERY = 100
const PAGE_SIZE = 20

/**
 * Their documented ceiling is ten searches a minute for an IP, and this
 * function is one IP for everybody. Eight leaves room for the retry somebody
 * always makes.
 *
 * ponytail: the window lives in the isolate, so two isolates are two buckets
 * and the real ceiling is higher than it says. It bounds the case that
 * matters, which is one person leaning on the button. A counter in Postgres
 * would make it exact, and is worth it the day merit has more users than a
 * household.
 */
const WINDOW_MS = 60_000
const LIMIT = 8
let recent: number[] = []

function allow(): boolean {
  const now = Date.now()
  recent = recent.filter((at) => now - at < WINDOW_MS)
  if (recent.length >= LIMIT) return false
  recent.push(now)
  return true
}

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
 * The role the caller's token was issued for. `verify_jwt` proves the token is
 * one of this project's and stops there, and the anon key is a valid token
 * that ships in the bundle. The quota is shared, so a signed-out caller does
 * not get to spend it.
 */
function role(request: Request): string | null {
  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer /i, '')
  const payload = token.split('.')[1]
  if (!payload) return null
  try {
    return (JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { role?: string })
      .role ?? null
  } catch {
    return null
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (role(request) !== 'authenticated') return json({ error: 'unauthorised' }, 401)

  const body = await request.json().catch(() => null)
  const query = typeof body?.query === 'string' ? body.query.trim().slice(0, MAX_QUERY) : ''
  if (query.length < MIN_QUERY) return json({ products: [] })

  if (!allow()) return json({ error: 'rate_limited' }, 429)

  const url = new URL(SEARCH)
  url.searchParams.set('q', query)
  url.searchParams.set('fields', FIELDS)
  url.searchParams.set('page_size', String(PAGE_SIZE))

  let response: Response
  try {
    response = await fetch(url, { headers: { accept: 'application/json', 'user-agent': IDENTITY } })
  } catch {
    return json({ error: 'unreachable' }, 502)
  }

  // Their 429 is passed on as itself. It means the whole project has been
  // searching too fast, which is a different sentence from "it is broken".
  if (!response.ok) {
    return response.status === 429
      ? json({ error: 'rate_limited' }, 429)
      : json({ error: 'upstream' }, 502)
  }

  const found = (await response.json().catch(() => null)) as { hits?: unknown[] } | null

  // Passed through as it comes, trimmed to the fields above. The mapping is
  // `mapOffProduct` in the client, which the barcode path already uses and
  // which is tested there: two mappings of one shape is one too many.
  return json({ products: found?.hits ?? [] })
})

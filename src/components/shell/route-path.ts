/**
 * What the header path bar says on each route (DESIGN.md §7).
 *
 * The vocabulary is deliberately the navigation's own — `nav.*`, not a second
 * set of page titles — so the sidebar, the tab bar, the path bar and the
 * screen's `h1` can never drift into two casings of the same word.
 *
 * Segments before the last are links; the last is where you are. The three
 * day-scoped screens carry a `today` segment because they are day-scoped by
 * definition (GOAL.md §2.1: nutrition is logged per day, training has a session
 * for today). The account is not, so it stops at two.
 */
export interface PathSegment {
  labelKey:
    | 'app.name'
    | 'nav.dashboard'
    | 'nav.food'
    | 'nav.training'
    | 'nav.cardio'
    | 'nav.account'
    | 'pages.legal.privacy.title'
    | 'pages.legal.imprint.title'
    | 'nav.weight'
    | 'nav.goals'
    | 'nav.profile'
    | 'nav.appearance'
    | 'nav.data'
    | 'nav.routines'
    | 'nav.session'
    | 'common.today'
    | 'common.add'
    | 'common.today'
    | 'common.notFound'
  /** Omitted on the last segment: you do not link to where you already are. */
  to?: string
}

const ROOT: PathSegment = { labelKey: 'app.name', to: '/' }

const PATHS: Record<string, PathSegment[]> = {
  '/': [ROOT, { labelKey: 'nav.dashboard', to: '/' }, { labelKey: 'common.today' }],
  '/food': [ROOT, { labelKey: 'nav.food', to: '/food' }, { labelKey: 'common.today' }],
  '/training': [ROOT, { labelKey: 'nav.training', to: '/training' }, { labelKey: 'common.today' }],
  '/food/add': [ROOT, { labelKey: 'nav.food', to: '/food' }, { labelKey: 'common.add' }],
  '/training/add': [ROOT, { labelKey: 'nav.training', to: '/training' }, { labelKey: 'common.add' }],
  '/training/routines': [ROOT, { labelKey: 'nav.training', to: '/training' }, { labelKey: 'nav.routines' }],
  '/training/day': [ROOT, { labelKey: 'nav.training', to: '/training' }, { labelKey: 'common.today' }],
  '/training/session': [ROOT, { labelKey: 'nav.training', to: '/training' }, { labelKey: 'nav.session' }],
  '/account': [ROOT, { labelKey: 'nav.account' }],
  '/account/profile': [ROOT, { labelKey: 'nav.account', to: '/account' }, { labelKey: 'nav.profile' }],
  '/account/appearance': [ROOT, { labelKey: 'nav.account', to: '/account' }, { labelKey: 'nav.appearance' }],
  '/account/data': [ROOT, { labelKey: 'nav.account', to: '/account' }, { labelKey: 'nav.data' }],
  '/legal/privacy': [ROOT, { labelKey: 'pages.legal.privacy.title' }],
  '/legal/imprint': [ROOT, { labelKey: 'pages.legal.imprint.title' }],
  '/cardio': [ROOT, { labelKey: 'nav.cardio' }],
  // Weight is a tab of its own now, so its path is two segments like the other
  // three. Goals stay under the account, which is where they are set from.
  '/weight': [ROOT, { labelKey: 'nav.weight', to: '/weight' }, { labelKey: 'common.today' }],
  '/goals': [ROOT, { labelKey: 'nav.account', to: '/account' }, { labelKey: 'nav.goals' }],
}

const NOT_FOUND: PathSegment[] = [ROOT, { labelKey: 'common.notFound' }]

/**
 * Paths with an id in them — a routine, a logged portion — are not keys in the
 * table above, so the longest listed path they sit under answers for them. A
 * routine's editor is `merit / training / routines`, which is where it is,
 * rather than "not found", which is what an exact-match lookup called it.
 */
export function pathSegments(pathname: string): PathSegment[] {
  const exact = PATHS[pathname]
  if (exact) return exact

  const parent = Object.keys(PATHS)
    .filter((path) => path !== '/' && pathname.startsWith(`${path}/`))
    .sort((a, b) => b.length - a.length)[0]

  return parent ? PATHS[parent] : NOT_FOUND
}

/**
 * The one label the header shows below `lg`. A three-segment path on a 375px
 * screen is noise (§7), so the screen names itself and the rest is dropped.
 *
 * The screen is the last segment that names a place: the root is the app, and a
 * trailing `today` qualifies a screen rather than being one. Taking the second
 * segment instead would name a nested screen after the section it hangs under —
 * `/weight` would announce itself as `more`.
 */
export function screenLabelKey(pathname: string): PathSegment['labelKey'] {
  const segments = pathSegments(pathname)
    .slice(1)
    .filter((segment) => segment.labelKey !== 'common.today')

  return (segments[segments.length - 1] ?? ROOT).labelKey
}

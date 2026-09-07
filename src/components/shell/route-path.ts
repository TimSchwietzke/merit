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
 * for today). `/more` is not, so it stops at two.
 */
export interface PathSegment {
  labelKey: 'app.name' | 'nav.dashboard' | 'nav.food' | 'nav.training' | 'nav.more' | 'common.today' | 'common.notFound'
  /** Omitted on the last segment: you do not link to where you already are. */
  to?: string
}

const ROOT: PathSegment = { labelKey: 'app.name', to: '/' }

const PATHS: Record<string, PathSegment[]> = {
  '/': [ROOT, { labelKey: 'nav.dashboard', to: '/' }, { labelKey: 'common.today' }],
  '/food': [ROOT, { labelKey: 'nav.food', to: '/food' }, { labelKey: 'common.today' }],
  '/training': [ROOT, { labelKey: 'nav.training', to: '/training' }, { labelKey: 'common.today' }],
  '/more': [ROOT, { labelKey: 'nav.more' }],
}

const NOT_FOUND: PathSegment[] = [ROOT, { labelKey: 'common.notFound' }]

export function pathSegments(pathname: string): PathSegment[] {
  return PATHS[pathname] ?? NOT_FOUND
}

/**
 * The one label the header shows below `lg`. A three-segment path on a 375px
 * screen is noise (§7), so the screen names itself and the rest is dropped —
 * which means the *screen* segment, not the trailing `today`.
 */
export function screenLabelKey(pathname: string): PathSegment['labelKey'] {
  const segments = pathSegments(pathname)
  return (segments[1] ?? ROOT).labelKey
}

import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { AppHeader } from '@/components/shell/AppHeader'
import { Nav } from '@/components/shell/Nav'
import { RouteSkeleton } from '@/components/Skeleton'
import { Toaster } from '@/components/ui/sonner'
import { PreferencesProvider } from '@/features/settings/PreferencesProvider'
import { ActiveSessionProvider } from '@/features/training/ActiveSession'
import { SessionBar } from '@/features/training/SessionBar'
import { useActiveSession } from '@/features/training/useActiveSession'

/**
 * The frame every route renders inside. `dvh`, never `vh` — mobile browser
 * chrome changes height as you scroll and `100vh` cuts the layout off exactly
 * when the keyboard is open (DESIGN.md §8).
 *
 * The header sits inside the content column rather than above the whole frame,
 * so from `lg` the path bar starts on the same left edge as the content and the
 * sidebar keeps the full height of the viewport.
 *
 * Gutters stop at 24px and the column stops at 860px (§5.2, §5.4): past that a
 * wide screen gets empty page, not inflated padding.
 */
export function AppShell() {
  return (
    // Owns the theme (and so keeps the document in step with the OS while the
    // preference is "system") as well as the locale, for every signed-in route.
    <PreferencesProvider>
      {/* Above the router: the session bar has to survive walking off to
          another tab mid-workout, which is the reason it is a bar. */}
      <ActiveSessionProvider>
        <Frame />
      </ActiveSessionProvider>
    </PreferencesProvider>
  )
}

/** Which domain hue a route wears. Nutrition is moss, which is also the
 *  default, so it needs no name here. */
function domainOf(pathname: string): 'training' | 'weight' | undefined {
  if (pathname.startsWith('/training')) return 'training'
  if (pathname.startsWith('/weight')) return 'weight'
  return undefined
}

/** Inside the provider, so the content can make room for the bar when there is
 *  one. A fixed element takes no space in the flow and would otherwise sit on
 *  top of the last thing on the page. */
function Frame() {
  const { running } = useActiveSession()
  const { pathname } = useLocation()

  return (
    // One attribute rebinds `accent` for everything inside it (tokens.css).
    <div data-domain={domainOf(pathname)} className="contents">
      {/* 
          The domain is the part of the body the screen is about — what you eat,
          what you lift, what you weigh — so the colour is never decoration and
          never arbitrary. The dashboard has none: it reports on all three, and
          each block there carries its own. */}
      <div className="min-h-[100dvh] lg:flex">
        <Nav />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader />
          <main
            className={`mx-auto w-full max-w-[860px] px-4 pt-5 md:px-6 md:pt-6 lg:pb-6 ${
              running
                ? 'pb-[calc(56px+9rem+env(safe-area-inset-bottom))]'
                : 'pb-[calc(56px+1.5rem+env(safe-area-inset-bottom))]'
            }`}
          >
            {/* No spinner, and no longer nothing either. A split chunk arrives
                in a frame or two on a good connection and in rather more on a
                gym one, and a blank `main` for that long is the first half of
                the flicker — the second being the screen's own data landing.
                A shape holds the space for both. */}
            <Suspense fallback={<RouteSkeleton />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
      <SessionBar />
      <Toaster />
    </div>
  )
}

import { Outlet } from 'react-router-dom'

import { Nav } from '@/components/shell/Nav'
import { PreferencesProvider } from '@/features/settings/PreferencesProvider'

/**
 * The frame every route renders inside. `dvh`, never `vh` — mobile browser
 * chrome changes height as you scroll and `100vh` cuts the layout off exactly
 * when the keyboard is open (DESIGN.md §8).
 */
export function AppShell() {
  return (
    // Owns the theme (and so keeps the document in step with the OS while the
    // preference is "system") as well as the locale, for every signed-in route.
    <PreferencesProvider>
      <div className="min-h-[100dvh] lg:flex">
        <Nav />
        <main
          className="mx-auto w-full max-w-[860px] px-4 pt-5 md:px-6 md:pt-6
                     pb-[calc(56px+1.5rem+env(safe-area-inset-bottom))] lg:pb-6"
        >
          <Outlet />
        </main>
      </div>
    </PreferencesProvider>
  )
}

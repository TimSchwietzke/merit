import { Outlet } from 'react-router-dom'

import { PreferencesProvider } from '@/features/settings/PreferencesProvider'

/**
 * The frame the legal pages render in, without an account.
 *
 * `AppShell` cannot serve here: it carries the navigation and the session bar,
 * both of which assume somebody is signed in. This is the theme and the locale
 * and nothing else, so the documents look like merit whether or not anybody has
 * ever logged in — which is the point, since these two pages are the ones a
 * stranger is most likely to arrive at first.
 */
export function LegalShell() {
  return (
    <PreferencesProvider>
      <main className="mx-auto w-full max-w-[860px] px-4 py-10 md:px-6">
        <Outlet />
      </main>
    </PreferencesProvider>
  )
}

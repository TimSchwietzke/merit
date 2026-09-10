import { useTranslation } from 'react-i18next'
import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom'

import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'

/**
 * What is shown when a route throws.
 *
 * Without this, React Router renders its own developer screen — the stack, the
 * module URL, and a cheerful note addressed to whoever wrote the app. That is
 * the right default for a framework and the wrong thing for somebody standing
 * in a gym: it says nothing they can act on and quite a lot about the machine.
 *
 * **A stale chunk is the common case and is not really an error.** Merit is
 * split into lazily-loaded routes, and a deploy replaces those files with new
 * hashed names. A tab left open across a deploy asks for a file that no longer
 * exists, and the browser reports it as a failed dynamic import. Reloading
 * fetches the new index and the problem is gone — so when the failure looks
 * like that, reloading is the *primary* action and the copy says so plainly
 * rather than apologising.
 *
 * Nothing here shows the underlying message. It is logged to the console for
 * whoever is debugging, and the person reading the screen gets a sentence and
 * two ways out (§10.8, §14).
 */
export default function RouteError() {
  const { t } = useTranslation()
  const error = useRouteError()

  // The one place a raw error is welcome. It is not rendered anywhere.
  console.error('route error', error)

  const stale = isStaleChunk(error)

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[860px] flex-col justify-center px-4 py-10 md:px-6">
      <PageHeader
        title={t(stale ? 'pages.error.stale.title' : 'pages.error.title')}
        lead={t(stale ? 'pages.error.stale.lead' : 'pages.error.lead')}
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        {stale ? (
          <>
            <Button variant="primary" onClick={() => window.location.reload()}>
              {t('pages.error.reload')}
            </Button>
            <Button asChild variant="quiet">
              <Link to="/">{t('pages.error.home')}</Link>
            </Button>
          </>
        ) : (
          <>
            <Button asChild variant="primary">
              <Link to="/">{t('pages.error.home')}</Link>
            </Button>
            <Button variant="quiet" onClick={() => window.location.reload()}>
              {t('pages.error.reload')}
            </Button>
          </>
        )}
      </div>
    </main>
  )
}

/**
 * Whether this is a route chunk that no longer exists on the server.
 *
 * Matched on the message rather than on a type, because every browser words it
 * differently and none of them gives it a class of its own: Chrome says
 * "Failed to fetch dynamically imported module", Safari "Importing a module
 * script failed", Firefox "error loading dynamically imported module". A
 * mismatch here costs the reader nothing — they get the ordinary error screen,
 * which offers the same reload one button further along.
 */
function isStaleChunk(error: unknown): boolean {
  if (isRouteErrorResponse(error)) return false
  const message = error instanceof Error ? error.message : String(error ?? '')
  return /dynamically imported module|importing a module script failed|failed to fetch dynamically/i.test(
    message,
  )
}

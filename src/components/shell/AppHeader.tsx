import { useTranslation } from 'react-i18next'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { User } from 'lucide-react'

import { pathSegments, screenLabelKey } from '@/components/shell/route-path'
import { useSession } from '@/features/auth/useSession'

/**
 * The sticky chrome (DESIGN.md §7). Thin: a hairline, a translucent page fill
 * and a blur — never an opaque bar with a shadow.
 *
 * From `lg` it carries the path bar — `merit / ernährung / heute` — and not a
 * page title. This is a carried-over signature rather than decoration: the
 * file-tree reading is what makes Merit read as a tool instead of a dashboard
 * template, so it is the header's whole job. Below `lg` it collapses to a
 * single mono label naming the screen.
 *
 * Its inner column repeats `<main>`'s width and gutters so the path sits on the
 * same left edge as the content beneath it.
 *
 * The avatar on the right is where the account lives — goals, language, theme,
 * export, signing out. It used to be a `more` tab, which spent one of four
 * places on the thing you touch least and put a daily number like weight behind
 * a menu. An account is not a section of the product; it is who is using it,
 * and it belongs in the chrome.
 */
export function AppHeader() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const segments = pathSegments(pathname)
  const { session } = useSession()
  const email = session?.user.email ?? null
  // One letter, not a photo: nobody in a group of ten uploads one, and an
  // empty circle where a face should be looks like a failure to load.
  const initial = email?.trim()?.[0] ?? null

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[860px] items-center gap-3 px-4 py-2.5 md:px-6">
        {/* Below lg. Not a heading — the screen owns its h1; this is chrome. */}
        <p className="font-mono text-2xs text-ink lg:hidden">{t(screenLabelKey(pathname))}</p>

        <nav
          aria-label={t('nav.path')}
          className="hidden font-mono text-2xs lg:flex lg:items-center"
        >
          {segments.map((segment, index) => {
            const last = index === segments.length - 1
            return (
              <span key={`${segment.labelKey}-${index}`} className="flex items-center">
                {index > 0 ? (
                  // A thin separator in line-strong, not a character doing an
                  // icon's job — it is punctuation and reads as punctuation.
                  <span aria-hidden className="px-1.5 text-line-strong">
                    /
                  </span>
                ) : null}
                {segment.to && !last ? (
                  <Link
                    to={segment.to}
                    className="text-ink-faint transition-colors [transition-duration:140ms] hover:text-ink"
                  >
                    {t(segment.labelKey)}
                  </Link>
                ) : (
                  // The current segment is promoted out of the faint run. No
                  // `aria-current` on it: the last segment is usually `today`
                  // rather than the page, and the nav already marks the route.
                  <span className={last ? 'text-ink' : 'text-ink-faint'}>
                    {t(segment.labelKey)}
                  </span>
                )}
              </span>
            )
          })}
        </nav>

        {/* Pushed right, and pulled 8px past the gutter so the glyph — not the
            44px target around it — lines up with the content's edge. */}
        <NavLink
          to="/account"
          aria-label={t('nav.account')}
          title={email ?? undefined}
          className={({ isActive }) =>
            `-mr-2 ml-auto inline-flex size-11 shrink-0 items-center justify-center rounded-full
             transition-colors [transition-duration:140ms] active:[transition-duration:0ms] ${
               isActive
                 ? 'bg-accent-soft text-accent'
                 : 'text-ink-muted hover:bg-surface-2 hover:text-ink active:bg-surface-2'
             }`
          }
        >
          {initial ? (
            <span
              aria-hidden
              className="flex size-7 items-center justify-center rounded-full bg-surface-2 font-mono text-2xs uppercase"
            >
              {initial}
            </span>
          ) : (
            <User size={18} strokeWidth={1.75} aria-hidden />
          )}
        </NavLink>
      </div>
    </header>
  )
}

import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'

import { pathSegments, screenLabelKey } from '@/components/shell/route-path'

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
 */
export function AppHeader() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const segments = pathSegments(pathname)

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[860px] items-center px-4 py-2.5 md:px-6">
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
      </div>
    </header>
  )
}

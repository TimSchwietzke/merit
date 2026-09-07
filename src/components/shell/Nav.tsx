import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'

import { NAV_ITEMS } from '@/components/shell/nav-items'
import { Wordmark } from '@/components/Wordmark'
import { cn } from '@/lib/utils'

/**
 * One component, both layouts: a bottom tab bar below `lg`, a sidebar from `lg`
 * up, same routes and same labels (DESIGN.md §7). The switch is CSS, not a
 * media-query hook — a hook would render the wrong bar for one frame.
 *
 * Every tab carries an icon *and* a label: an icon-only tab bar is a guessing
 * game in a second language (§12). Labels wrap rather than truncate, because
 * `Ernährung` is longer than `Food` (§9).
 */
export function Nav() {
  const { t } = useTranslation()

  return (
    <>
      {/* Sidebar — lg and up. 240px, bordered, not shadowed. */}
      <nav
        aria-label={t('nav.label')}
        className="hidden lg:sticky lg:top-0 lg:flex lg:h-[100dvh] lg:w-60 lg:shrink-0 lg:flex-col lg:gap-1 lg:border-r lg:border-line lg:bg-surface lg:px-3 lg:py-5"
      >
        <Wordmark className="mb-4 px-2.5" />
        {NAV_ITEMS.map(({ to, labelKey, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex min-h-[36px] items-center gap-2 rounded-md px-2.5 py-2 transition-colors [transition-duration:140ms] active:[transition-duration:0ms]',
                isActive
                  ? 'bg-accent-soft font-medium text-accent'
                  : 'text-ink-muted hover:bg-surface-2 hover:text-ink active:bg-surface-2',
              )
            }
          >
            <Icon size={15} strokeWidth={1.75} className="shrink-0" aria-hidden />
            {t(labelKey)}
          </NavLink>
        ))}
      </nav>

      {/* Bottom bar — below lg. A plane, not a floating translucent pill:
          it has to stay legible over a scrolling chart (§7). */}
      <nav
        aria-label={t('nav.label')}
        className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {/* 52px cells inside a 56px bar (§5.4); gap-2 keeps at least 8px
            between adjacent touch targets (§5.2). */}
        <ul className="mx-auto flex max-w-[860px] gap-2 px-2 py-0.5">
          {NAV_ITEMS.map(({ to, labelKey, Icon }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-[52px] flex-col items-center justify-center gap-1 px-1 py-1.5 text-center text-2xs leading-tight',
                    isActive ? 'font-medium text-accent' : 'text-ink-faint active:bg-surface-2',
                  )
                }
              >
                <Icon size={18} strokeWidth={1.75} className="shrink-0" aria-hidden />
                {t(labelKey)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}

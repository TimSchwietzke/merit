import { Apple, Dumbbell, LayoutDashboard, Menu, type LucideIcon } from 'lucide-react'

/**
 * Four tabs, and four is the ceiling — a fifth means the information
 * architecture is wrong (DESIGN.md §7). Weight, settings, export and the legal
 * pages live under /more rather than becoming tabs of their own.
 *
 * `labelKey` rather than a label: no user-facing string is written in a
 * component (CLAUDE.md hard rule 3).
 */
export interface NavItem {
  to: string
  labelKey: 'nav.dashboard' | 'nav.food' | 'nav.training' | 'nav.more'
  Icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', labelKey: 'nav.dashboard', Icon: LayoutDashboard },
  { to: '/food', labelKey: 'nav.food', Icon: Apple },
  { to: '/training', labelKey: 'nav.training', Icon: Dumbbell },
  { to: '/more', labelKey: 'nav.more', Icon: Menu },
]

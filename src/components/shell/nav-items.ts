import { Apple, Dumbbell, HeartPulse, Scale, type LucideIcon } from 'lucide-react'

/**
 * The four essentials, and the brand in the middle.
 *
 * They are the four things this app is for, what you lift, what you spend,
 * what you eat, what you weigh, and each owns a colour that says which one you
 * are inside (`tokens.css`). Weight was under `more` for a while, which put a
 * daily number two taps behind a menu; `more` itself is gone, and settings and
 * goals now live behind the avatar in the header where an account belongs.
 *
 * The dashboard is deliberately not in this list. It is not a peer of the four
 *, it reports across all of them, so it is rendered as a raised centre button
 * between them rather than as a fifth equal tab (DESIGN.md §7).
 *
 * `labelKey` rather than a label: no user-facing string is written in a
 * component (CLAUDE.md hard rule 3).
 */
export interface NavItem {
  to: string
  labelKey: 'nav.food' | 'nav.training' | 'nav.weight' | 'nav.cardio'
  Icon: LucideIcon
}

/** Two on each side of the centre button, in the order they are reached for. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/training', labelKey: 'nav.training', Icon: Dumbbell },
  { to: '/cardio', labelKey: 'nav.cardio', Icon: HeartPulse },
  { to: '/food', labelKey: 'nav.food', Icon: Apple },
  { to: '/weight', labelKey: 'nav.weight', Icon: Scale },
]

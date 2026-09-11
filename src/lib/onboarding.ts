import type { ActivityLevel, Direction, Sex } from '@/lib/goals'

/**
 * Where a run of the first-run walkthrough starts, and what it is still
 * waiting for.
 *
 * The walkthrough is skippable and resumable (GOAL.md §2.1.1), which is two
 * rules about one question: what has this account already answered. It is
 * answered from the data itself rather than from a stored position, because a
 * stored position goes stale the moment somebody sets their height on the
 * targets screen instead. Everything here is a pure function of what is in the
 * database, which is also what makes it testable.
 */

/** In order. Each screen asks for the things the next one reads best with. */
export const STEPS = ['name', 'body', 'about', 'goal', 'target'] as const

export type Step = (typeof STEPS)[number]

export interface Answers {
  displayName: string | null
  weightKg: number | null
  heightCm: number | null
  birthDate: string | null
  sex: Sex | null
  activityLevel: ActivityLevel | null
  direction: Direction | null
  /** Whether a daily target is already in force. */
  hasTarget: boolean
}

/** A step counts as answered when everything it asks for has a value. */
const answered: Record<Step, (answers: Answers) => boolean> = {
  name: (a) => a.displayName !== null,
  body: (a) => a.weightKg !== null && a.heightCm !== null,
  about: (a) => a.birthDate !== null && a.sex !== null,
  goal: (a) => a.activityLevel !== null && a.direction !== null,
  target: (a) => a.hasTarget,
}

/** The first step still missing something, or null when none is. */
export function firstUnanswered(answers: Answers): Step | null {
  return STEPS.find((step) => !answered[step](answers)) ?? null
}

/**
 * Which screen the walkthrough opens on.
 *
 * The introduction is for somebody who has not started. Coming back to a
 * half-finished setup goes straight to the question that stopped it, since
 * being shown the same four panels again is the app forgetting where you were.
 * Running it again deliberately, from the account screen, gets the whole thing
 * from the top.
 */
export function resumeAt(answers: Answers, onboarded: boolean): { intro: boolean; step: Step } {
  const next = firstUnanswered(answers)
  if (onboarded || next === STEPS[0]) return { intro: true, step: STEPS[0] }
  return { intro: false, step: next ?? 'target' }
}

import { daysBetween } from '@/lib/date'
import { ATWATER } from '@/lib/nutrition'

/**
 * Daily targets, and the arithmetic behind the calculated one.
 *
 * What this file does *not* do is recommend anything. It turns figures the user
 * entered about themselves into an energy figure and shows its working; it does
 * not decide what somebody should eat (CLAUDE.md hard rule 5). Macros are typed
 * in both modes for the same reason — GOAL.md §5 asks for the *calorie* goal to
 * be calculable, and picking a protein split for a person is advice.
 */

export type GoalMode = 'manual' | 'calculated'
export type Sex = 'female' | 'male'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type Direction = 'lose' | 'maintain' | 'gain'

export const ACTIVITY_LEVELS: readonly ActivityLevel[] = [
  'sedentary',
  'light',
  'moderate',
  'active',
  'very_active',
]

export const DIRECTIONS: readonly Direction[] = ['lose', 'maintain', 'gain']

/**
 * The usual multipliers on resting expenditure. They are coarse by nature —
 * anybody's real figure sits somewhere between two of them — which is why the
 * screen shows the maintenance number it derived rather than only the target.
 */
export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

/**
 * How far the target sits from maintenance. A proportion rather than a flat
 * number of calories, so it scales with the person: 500 kcal is a fifth of a
 * small woman's day and a seventh of a large man's.
 */
export const DIRECTION_SHIFT: Record<Direction, number> = {
  lose: -0.15,
  maintain: 0,
  gain: 0.15,
}

export interface Targets {
  kcal: number
  proteinG: number
  fatG: number
  carbsG: number
}

export interface Goal extends Targets {
  mode: GoalMode
  /** Day key the target came into force. */
  validFrom: string
}

export interface BodyInputs {
  weightKg: number
  heightCm: number
  birthDate: string
  sex: Sex
  activityLevel: ActivityLevel
  direction: Direction
}

/** Whole years, from a day key to a day key. */
export function ageOn(birthDate: string, on: string): number {
  const [by, bm, bd] = birthDate.split('-').map(Number)
  const [oy, om, od] = on.split('-').map(Number)
  const hadBirthday = om > bm || (om === bm && od >= bd)
  return oy - by - (hadBirthday ? 0 : 1)
}

/**
 * Resting energy by Mifflin–St Jeor, which is the equation that has held up
 * best against measurement in ordinary adults.
 *
 *   10 × kg + 6.25 × cm − 5 × years + 5   (male)
 *                                    − 161 (female)
 */
export function restingEnergy(inputs: Omit<BodyInputs, 'direction'>, on: string): number {
  const age = ageOn(inputs.birthDate, on)
  const base = 10 * inputs.weightKg + 6.25 * inputs.heightCm - 5 * age
  return base + (inputs.sex === 'male' ? 5 : -161)
}

/** Resting energy times the activity factor: what a day costs to hold steady. */
export function maintenanceEnergy(inputs: Omit<BodyInputs, 'direction'>, on: string): number {
  return restingEnergy(inputs, on) * ACTIVITY_FACTORS[inputs.activityLevel]
}

export interface CalculatedEnergy {
  resting: number
  maintenance: number
  target: number
}

/**
 * The calculated calorie figure, with its working.
 *
 * All three numbers are returned because the screen shows all three. A single
 * target with no maintenance beside it is a number the user has to take on
 * trust, and this one rests on an equation and a coarse multiplier.
 */
export function calculateEnergy(inputs: BodyInputs, on: string): CalculatedEnergy {
  const resting = restingEnergy(inputs, on)
  const maintenance = resting * ACTIVITY_FACTORS[inputs.activityLevel]
  return {
    resting,
    maintenance,
    target: maintenance * (1 + DIRECTION_SHIFT[inputs.direction]),
  }
}

/** Which inputs the calculation still needs. Empty means it can run. */
export function missingInputs(inputs: Partial<BodyInputs>): (keyof BodyInputs)[] {
  const needed: (keyof BodyInputs)[] = [
    'weightKg',
    'heightCm',
    'birthDate',
    'sex',
    'activityLevel',
    'direction',
  ]
  return needed.filter((key) => inputs[key] === null || inputs[key] === undefined)
}

/**
 * The target in force on a given day: the most recent one that had already
 * started. Targets are a history, so a figure raised in March leaves January
 * measured against what January actually had.
 */
export function goalOn(goals: readonly Goal[], date: string): Goal | null {
  let active: Goal | null = null
  for (const goal of goals) {
    if (daysBetween(goal.validFrom, date) < 0) continue
    if (!active || daysBetween(active.validFrom, goal.validFrom) > 0) active = goal
  }
  return active
}

export interface Progress {
  /** Signed: negative means still to go, positive means past the target. */
  over: number
  /** 0–1 for the filled part; the overshoot is reported separately. */
  fraction: number
  overshoot: number
}

/**
 * A total against a target (DESIGN.md §10.9).
 *
 * Undershooting and overshooting are the same arithmetic, but the screen treats
 * them differently — a day in progress is not a failed day — so the overshoot
 * is separated out rather than left as a fraction above 1 for a bar to clamp.
 */
export function progress(total: number, target: number): Progress {
  if (target <= 0) return { over: 0, fraction: 0, overshoot: 0 }
  const fraction = Math.min(1, total / target)
  return {
    over: total - target,
    fraction,
    overshoot: Math.max(0, total / target - 1),
  }
}

/**
 * Starting points for the macro split, both editable on screen.
 *
 * 1.8 g of protein per kilogram and 30% of energy from fat are the reference
 * points these calculators conventionally use — protein scaled to body mass,
 * fat as a share of the day. Neither is Merit telling anybody what to eat: they
 * are the two knobs of an arithmetic split, shown next to the result, and the
 * three figures they produce stay editable afterwards.
 */
export const MACRO_DEFAULTS = { proteinPerKg: 1.8, fatShare: 0.3 } as const

export interface MacroSplitInputs {
  kcal: number
  weightKg: number
  /** Grams of protein per kilogram of body weight. */
  proteinPerKg: number
  /** Share of the day's energy from fat, 0–1. */
  fatShare: number
}

/**
 * Protein from body weight, fat from a share of the energy, carbohydrate from
 * whatever is left. Converted through the Atwater factors, which is the same
 * arithmetic the macro ring uses to split a day.
 *
 * Carbohydrate cannot go below zero: a high protein-per-kilogram against a low
 * calorie target can spend the whole day before any carbohydrate is reached,
 * and a negative gram figure is not a target anybody can log against.
 */
export function calculateMacros({
  kcal,
  weightKg,
  proteinPerKg,
  fatShare,
}: MacroSplitInputs): { proteinG: number; fatG: number; carbsG: number } {
  const proteinG = weightKg * proteinPerKg
  const fatG = (kcal * fatShare) / ATWATER.fat
  const spent = proteinG * ATWATER.protein + fatG * ATWATER.fat
  return { proteinG, fatG, carbsG: Math.max(0, (kcal - spent) / ATWATER.carbs) }
}

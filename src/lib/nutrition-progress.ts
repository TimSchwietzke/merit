import { addDays } from '@/lib/date'

/** What was eaten on one day. Days with nothing logged do not appear. */
export interface DayTotal {
  date: string
  kcal: number
}

/**
 * How the last stretch of days went against a calorie target.
 *
 * Every function here reads only the days that were actually logged. An
 * unlogged day is not a zero-calorie day, and averaging one in would report
 * somebody as eating far less than they did — which is the same mistake as
 * summing a missing nutrient as zero, one level up (PRODUCT.md).
 */

/** The window's logged days, most recent last. */
export function inWindow(totals: readonly DayTotal[], today: string, days: number): DayTotal[] {
  const from = addDays(today, -(days - 1))
  return totals
    .filter((day) => day.date >= from && day.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Mean calories across the logged days of the window, or null when there are
 * none.
 *
 * Null rather than zero: no days logged means the question has no answer, and
 * a `0 kcal` average is a claim about somebody's eating rather than an absence
 * of data.
 */
export function averageKcal(totals: readonly DayTotal[], today: string, days = 7): number | null {
  const window = inWindow(totals, today, days)
  if (window.length === 0) return null
  return window.reduce((sum, day) => sum + day.kcal, 0) / window.length
}

/**
 * Logged days inside a band around the target, and how many were logged at all.
 *
 * ±20% by default, which is §10.10's consistency band. Both numbers are
 * returned because one without the other is unreadable: `4` means something
 * very different out of five days than out of twenty-eight.
 */
export function daysOnTarget(
  totals: readonly DayTotal[],
  target: number,
  today: string,
  days = 28,
  band = 0.2,
): { met: number; logged: number } {
  const window = inWindow(totals, today, days)
  const low = target * (1 - band)
  const high = target * (1 + band)

  return {
    met: window.filter((day) => day.kcal >= low && day.kcal <= high).length,
    logged: window.length,
  }
}

/**
 * The window as a dense series for a chart, oldest first, with unlogged days
 * carried as null.
 *
 * Null, not zero, for the same reason as above — and Recharts draws a gap for
 * null, which is the honest rendering: the line stops where the data stops
 * rather than diving to the floor and back.
 */
export function kcalSeries(
  totals: readonly DayTotal[],
  today: string,
  days = 14,
): { date: string; kcal: number | null }[] {
  const byDate = new Map(totals.map((day) => [day.date, day.kcal]))

  return Array.from({ length: days }, (_, index) => {
    const date = addDays(today, -(days - 1 - index))
    return { date, kcal: byDate.get(date) ?? null }
  })
}

import { addDays, dayRange, daysBetween } from '@/lib/date'

/**
 * The weight maths. Everything here is a pure function over day keys, so the
 * chart, the list and the dashboard all read the same numbers (CLAUDE.md, Code).
 */

export interface WeightEntry {
  /** Day key, `YYYY-MM-DD` in the user's timezone. */
  date: string
  weightKg: number
  bodyFatPct: number | null
}

export interface WeightPoint {
  date: string
  /** null on a day with no weigh-in. A gap must stay a gap (DESIGN.md §11). */
  weightKg: number | null
  averageKg: number | null
}

export const AVERAGE_WINDOW_DAYS = 7

export const WEIGHT_RANGES = ['7', '30', '90', 'all'] as const
export type WeightRange = (typeof WEIGHT_RANGES)[number]

/** Bounds shared with the `weight_kg` check constraint on the table. */
export const WEIGHT_LIMITS = { min: 20, max: 400, decimals: 2 } as const
export const BODY_FAT_LIMITS = { min: 1, max: 75, decimals: 1 } as const

/**
 * The mean of every weigh-in in the seven calendar days ending on `on`.
 *
 * Calendar days, not the last seven entries: somebody who weighs in twice a week
 * should get a fortnight-wide average from a "7-day" line, which is not what the
 * label says. Null when the window is empty.
 */
export function rollingAverage(
  entries: readonly WeightEntry[],
  on: string,
  windowDays: number = AVERAGE_WINDOW_DAYS,
): number | null {
  const from = addDays(on, -(windowDays - 1))

  let sum = 0
  let count = 0
  for (const entry of entries) {
    if (daysBetween(from, entry.date) < 0 || daysBetween(entry.date, on) < 0) continue
    sum += entry.weightKg
    count += 1
  }

  return count === 0 ? null : sum / count
}

/**
 * One point per calendar day between `from` and `to`, so the x-axis is time and
 * not a list of the days that happen to have data — a fortnight away shows as a
 * fortnight-wide gap rather than as one short step.
 *
 * The average is only computed on days that carry a weigh-in. Continuing it
 * across a gap would draw a flat week of stale data, which is exactly the
 * interpolation §11 rules out; both series break together instead.
 */
export function buildSeries(
  entries: readonly WeightEntry[],
  from: string,
  to: string,
  windowDays: number = AVERAGE_WINDOW_DAYS,
): WeightPoint[] {
  const byDate = new Map(entries.map((entry) => [entry.date, entry]))

  return dayRange(from, to).map((date) => {
    const entry = byDate.get(date)
    return {
      date,
      weightKg: entry?.weightKg ?? null,
      averageKg: entry ? rollingAverage(entries, date, windowDays) : null,
    }
  })
}

/** Tick steps a reader recognises. All exact in binary, so the bounds built
 *  from them do not come back as 82.00000000000001. */
const TICK_STEPS = [0.25, 0.5, 1, 2, 5, 10, 25]

/** Recharts' default, and what the span below is divided into. */
const TICK_INTERVALS = 4

/**
 * The y-axis bounds. Never zero-based — a 2 kg movement inside an 80 kg number
 * is the entire signal, and a zero baseline flattens it to nothing (§11).
 *
 * Padded by 15% of the visible spread with a 0.5 kg floor so a single point, or
 * a week that barely moved, does not become a line hugging the frame.
 *
 * The span is then a whole number of tick steps starting on one, because the
 * chart divides it into four regardless: an arbitrary domain gives arbitrary
 * ticks, and 84.0 / 83.2 / 82.3 / 81.4 reads as noise where 84 / 83 / 82 / 81
 * reads as a scale.
 */
export function weightDomain(points: readonly WeightPoint[]): [number, number] | null {
  const values = points.flatMap((point) =>
    [point.weightKg, point.averageKg].filter((value): value is number => value !== null),
  )
  if (values.length === 0) return null

  const pad = Math.max(0.5, (Math.max(...values) - Math.min(...values)) * 0.15)
  const low = Math.min(...values) - pad
  const high = Math.max(...values) + pad

  for (const step of TICK_STEPS) {
    const start = Math.floor(low / step) * step
    if (start + TICK_INTERVALS * step >= high) return [start, start + TICK_INTERVALS * step]
  }
  return [low, high]
}

/**
 * The change against last week, as `82.4 kg · −0.3 vs. last week` (§14).
 *
 * Both sides are seven-day averages rather than two single weigh-ins. Day-to-day
 * weight swings by a kilo on water alone, so comparing today with the same
 * weekday a week ago reports mostly noise as though it were progress.
 */
export function weeklyDelta(
  entries: readonly WeightEntry[],
  today: string,
  windowDays: number = AVERAGE_WINDOW_DAYS,
): number | null {
  const current = rollingAverage(entries, today, windowDays)
  const previous = rollingAverage(entries, addDays(today, -windowDays), windowDays)
  if (current === null || previous === null) return null
  return current - previous
}

/** The most recent weigh-in, or null. Entries need not be sorted. */
export function latestEntry(entries: readonly WeightEntry[]): WeightEntry | null {
  let latest: WeightEntry | null = null
  for (const entry of entries) {
    if (!latest || daysBetween(latest.date, entry.date) > 0) latest = entry
  }
  return latest
}

/** The first day a range covers, or null for `all`. */
export function rangeStart(range: WeightRange, today: string): string | null {
  if (range === 'all') return null
  return addDays(today, -(Number(range) - 1))
}

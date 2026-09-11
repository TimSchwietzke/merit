/**
 * Day keys, `YYYY-MM-DD` in the *user's* timezone.
 *
 * Postgres stores these columns as `date`, and a date has no timezone. The whole
 * risk lives on this side: `toISOString()` returns UTC, so a weigh-in at 23:30
 * in Berlin becomes tomorrow and a meal logged at 00:30 becomes yesterday
 * (CLAUDE.md, Dates). Nothing in Merit may convert a day through UTC, so every
 * conversion between a `Date` and a day key goes through this module.
 */

const pad = (n: number) => String(n).padStart(2, '0')

/** The local calendar day a moment falls on. */
export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function todayKey(now: Date = new Date()): string {
  return dateKey(now)
}

/**
 * A day key as local midnight. `new Date('2026-09-08')` parses as UTC midnight,
 * which is the previous day everywhere west of Greenwich; the three-argument
 * constructor is local by definition.
 */
export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * `days` calendar days from `key`. Going through the Date constructor rather
 * than adding 86400000ms keeps it correct across a DST boundary, where a day is
 * 23 or 25 hours long.
 */
export function addDays(key: string, days: number): string {
  const date = parseDateKey(key)
  date.setDate(date.getDate() + days)
  return dateKey(date)
}

/** Whole days from `from` to `to`, negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  const ms = parseDateKey(to).getTime() - parseDateKey(from).getTime()
  // Round rather than truncate: a DST shift makes one of these 23 or 25 hours.
  return Math.round(ms / 86_400_000)
}

/** Every day from `from` to `to` inclusive, ascending. */
export function dayRange(from: string, to: string): string[] {
  const days: string[] = []
  for (let key = from; daysBetween(key, to) >= 0; key = addDays(key, 1)) days.push(key)
  return days
}

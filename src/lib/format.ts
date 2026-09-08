/**
 * Number formatting for display only.
 *
 * Rounding happens here and nowhere else: values are stored and summed at full
 * precision, and a figure is only ever shortened on its way to the screen
 * (CLAUDE.md, Code). German writes 82,4 and English 82.4, so every number on
 * screen goes through `Intl` with the active locale rather than `toFixed`.
 */

export function formatNumber(value: number, locale: string, digits = 1): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

/**
 * A change, always carrying its sign — `+0,4`, `−0,3`.
 *
 * The hyphen CLDR hands back for English is normalised to a real minus (U+2212).
 * German already gets one, and a delta that is a minus sign in one language and
 * a hyphen in the other is a difference in typography, not in locale: a hyphen
 * sits lower and shorter than the plus it alternates with.
 */
export function formatDelta(value: number, locale: string, digits = 1): string {
  return new Intl.NumberFormat(locale, {
    signDisplay: 'always',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
    .format(value)
    .replace('-', '\u2212')
}

/**
 * A stored number, written back into an editable field.
 *
 * Trailing zeros are dropped and nothing is rounded away: `82.45` comes back as
 * `82,45` and not as `82,5`, or correcting a body-fat figure would silently
 * change the weight next to it.
 */
export function formatForInput(value: number, locale: string, decimals: number): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
    useGrouping: false,
  }).format(value)
}

/**
 * A day key as a short date in the active locale. `parseDateKey` is not used
 * here to keep this module free of the date one; the three-argument constructor
 * is local-midnight for the same reason it is there.
 */
export function formatDayShort(key: string, locale: string): string {
  const [year, month, day] = key.split('-').map(Number)
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(
    new Date(year, month - 1, day),
  )
}

export function formatDayLong(key: string, locale: string): string {
  const [year, month, day] = key.split('-').map(Number)
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))
}

/**
 * A typed decimal, accepting both separators.
 *
 * Half of Europe writes a comma and `type="number"` rejects it (DESIGN.md §8),
 * so the field is `inputMode="decimal"` text and the parsing is ours. Returns
 * null for anything that is not a plain positive decimal in range — no
 * exponents, no signs, no thousands separators. Refusing beats guessing here:
 * `1,234` means one point two three four to a German and one thousand to
 * everyone else.
 */
export function parseDecimalInput(
  raw: string,
  { min, max, decimals }: { min: number; max: number; decimals: number },
): number | null {
  const normalised = raw.trim().replace(',', '.')
  if (!new RegExp(`^\\d{1,4}(\\.\\d{1,${decimals}})?$`).test(normalised)) return null

  const value = Number(normalised)
  if (!Number.isFinite(value) || value < min || value > max) return null
  return value
}

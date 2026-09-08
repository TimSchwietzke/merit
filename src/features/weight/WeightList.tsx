import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/EmptyState'
import { Row, Rows } from '@/components/Rows'
import { Value } from '@/components/Value'
import { formatDayLong, formatDayShort, formatDelta, formatNumber } from '@/lib/format'
import { todayKey } from '@/lib/date'
import type { WeightEntry } from '@/lib/weight'

/**
 * The weigh-ins, most recent first (DESIGN.md §10.1).
 *
 * A row is a link to editing that day, not a row with a delete button in it: a
 * destructive control 8px from a value in a 52px row gets hit by accident. The
 * form below is where a day is corrected or removed.
 *
 * Each row carries its change against the weigh-in before it — a number with a
 * comparison rather than a bare figure (§14). It is the previous *entry*, not
 * the previous day, so a gap does not produce a delta of nothing.
 */
export function WeightList({
  entries,
  selected,
  empty,
  onSelect,
}: {
  /** Ascending by date, as the hook holds them. */
  entries: WeightEntry[]
  selected: string
  /** Why the list is empty — nothing logged at all reads differently from
   *  nothing logged in the range on screen (§14). */
  empty: string
  onSelect: (date: string) => void
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const today = todayKey()

  if (entries.length === 0) return <EmptyState>{empty}</EmptyState>

  return (
    <Rows>
      {entries
        .map((entry, index) => ({ entry, previous: entries[index - 1] ?? null }))
        .reverse()
        .map(({ entry, previous }) => (
          <Row key={entry.date} onClick={() => onSelect(entry.date)}>
            <span className="min-w-0 flex-1 truncate">
              {entry.date === today ? t('common.today') : formatDayShort(entry.date, locale)}
              {/* The full date stays available to a screen reader and to a
                  hover: `08 Sep` is ambiguous once a year rolls over. */}
              <span className="sr-only"> · {formatDayLong(entry.date, locale)}</span>
              {entry.date === selected ? (
                <span className="ml-2 font-mono text-2xs text-accent">
                  {t('pages.weight.list.editing')}
                </span>
              ) : null}
            </span>

            {entry.bodyFatPct === null ? null : (
              <span className="shrink-0 font-mono text-2xs tabular-nums text-ink-faint">
                {formatNumber(entry.bodyFatPct, locale)} %
              </span>
            )}

            {previous ? (
              <span className="shrink-0 font-mono text-2xs tabular-nums text-ink-faint">
                {formatDelta(entry.weightKg - previous.weightKg, locale)}
              </span>
            ) : null}

            <span className="shrink-0">
              <Value n={formatNumber(entry.weightKg, locale)} unit="kg" />
            </span>
          </Row>
        ))}
    </Rows>
  )
}

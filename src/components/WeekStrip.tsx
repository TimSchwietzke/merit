import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { formatDayLong, formatDayRange, weekdayLabel } from '@/lib/format'
import { isoWeekday } from '@/lib/training'

/**
 * A week you consult to change which day the screen is about.
 *
 * Seven tiles rather than a seven-item list, which is how every calendar on the
 * phone this runs on behaves and how the Fitness app puts a week above a day's
 * detail. It costs one line of screen instead of eight, so the day below it
 * gets the room, and moving between days changes that block in place rather
 * than pushing a new screen.
 *
 * **Choosing a day changes the block below it and nothing else** — no route, no
 * push, no back button. That is the whole reason it exists rather than a list
 * of seven rows, which cost a screen of height to say the same thing and made
 * the day you cared about scroll.
 *
 * Each tile carries the mosaic mark from §10.10, told apart by fill density
 * rather than hue: half-strength `accent` for something planned, full `accent`
 * for something done, and nothing at all for a day with neither. The heatmap
 * draws its empty state because a grid with holes stops being a grid; a row of
 * seven does not, and a week of faint grey marks with two solid ones in it
 * reads as five things you failed to do.
 *
 * The colour arrives through `accent`, so the strip is oxide on training and
 * moss on nutrition without knowing either.
 */
export type DayMark = 'none' | 'partial' | 'done'

export function WeekStrip({
  week,
  today,
  selected,
  locale,
  markOf,
  onSelect,
  onShift,
  direction,
  label,
}: {
  /** Monday to Sunday, as day keys. */
  week: string[]
  today: string
  selected: string
  locale: string
  markOf: (date: string) => DayMark
  onSelect: (date: string) => void
  onShift: (by: -1 | 1) => void
  /** Which way the last week change went, so the row can arrive from there. */
  direction: -1 | 0 | 1
  /** Names the group for a screen reader — `this week`. */
  label: string
}) {
  const { t } = useTranslation()

  const fill: Record<DayMark, string> = {
    none: 'bg-transparent',
    partial: 'bg-accent/55',
    done: 'bg-accent',
  }

  // A plane lifted off the ground by fill, with no border doing the work. On
  // the dark ground the step is the structure; the week is reference and reads
  // as one block you consult, rather than as seven controls loose on the page.
  return (
    <div className="rounded-lg bg-surface p-2">
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="bare"
          size="icon"
          aria-label={t('common.week.previous')}
          onClick={() => onShift(-1)}
        >
          <ChevronLeft />
        </Button>
        <p className="font-mono text-2xs text-ink-faint">
          {formatDayRange(week[0], week[6], locale)}
        </p>
        <Button
          variant="bare"
          size="icon"
          aria-label={t('common.week.next')}
          onClick={() => onShift(1)}
        >
          <ChevronRight />
        </Button>
      </div>

      {/* A radio group, not seven buttons: exactly one day is being looked at,
          and arrow keys should walk the week (§10.7).

          Keyed on the week so a change of week remounts the row and it arrives
          from the side it came from — the chevron says which way, and the row
          agrees with it. */}
      <div
        key={week[0]}
        role="radiogroup"
        aria-label={label}
        className={`-mx-1 mt-1 flex gap-0.5 ${
          direction === 0 ? '' : direction > 0 ? 'merit-left' : 'merit-right'
        }`}
      >
        {week.map((date) => {
          const isSelected = date === selected
          const isToday = date === today

          return (
            <button
              key={date}
              type="button"
              role="radio"
              aria-checked={isSelected}
              // The visible text is `Mo` above `07`, which a screen reader
              // reads as "Mo07". The date is said properly instead.
              aria-label={formatDayLong(date, locale)}
              onClick={() => onSelect(date)}
              className={`flex min-h-11 flex-1 flex-col items-center gap-1 rounded-md border px-1 pb-2 pt-1.5
                          transition-colors [transition-duration:140ms] active:[transition-duration:0ms]
                          ${
                            isSelected
                              ? 'border-accent bg-accent-soft'
                              : isToday
                                ? 'border-line-strong active:bg-surface-2'
                                : 'border-transparent active:bg-surface-2'
                          }`}
            >
              <span
                className={`font-mono text-2xs ${
                  isToday ? 'text-accent' : isSelected ? 'text-ink-muted' : 'text-ink-faint'
                }`}
              >
                {weekdayLabel(isoWeekday(date), locale)}
              </span>
              <span
                className={`font-mono text-sm tabular-nums ${
                  isSelected ? 'font-medium text-ink' : 'text-ink-muted'
                }`}
              >
                {date.slice(8)}
              </span>
              {/* The mosaic cell from the house style, one per day. Fixed
                  width, not the tile's: on a desktop column the tile is 100px
                  wide and a mark that fills it stops being a mark and becomes
                  an underline. */}
              <span aria-hidden className={`h-1 w-6 rounded-sm ${fill[markOf(date)]}`} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

import { useTranslation } from 'react-i18next'

import { MuscleMap } from '@/components/MuscleMap'
import type { ExerciseRef } from '@/features/training/useWorkout'
import { COLD_AFTER_DAYS, coldest, daysSinceWorked, glow } from '@/lib/recency'
import type { SessionSets } from '@/lib/training'

/**
 * What the body has had lately, and what it has not.
 *
 * The picture says it and nothing repeats it in words. A caption under a
 * drawing this legible is the screen explaining its own illustration, and
 * naming the coldest region in a sentence turns a glance into a verdict — which
 * is the one thing this is not for. The sentence survives as the map's label,
 * where somebody who cannot see the picture still gets it.
 *
 * The one thing this screen can say that no tab can. Training shows what is
 * planned and what was done; neither notices that nothing has touched your legs
 * in nine days, because both are looking at a day or a routine and this is a
 * question about the gaps between them.
 *
 * Brightest for trained today, fading evenly to dark over a week. Continuous
 * rather than bucketed, because "how long ago" is continuous and three steps
 * would make day three and day five look the same. Past a week everything is
 * equally dark: the distinction stops being useful there and starts being a
 * reproach, which is the one thing this app does not do.
 *
 * The line beneath names the coldest region in words. The map is the glance;
 * the sentence is what somebody acts on, and it is also what a screen reader
 * gets instead of ninety unlabelled paths.
 */
export function MuscleRecency({
  history,
  exercises,
  today,
}: {
  history: SessionSets[]
  exercises: ReadonlyMap<string, ExerciseRef>
  today: string
}) {
  const { t } = useTranslation()
  const days = daysSinceWorked(history, exercises, today)

  // Nothing trained in the window is not a body full of reproach; it is an
  // account with no training in it, and the screen says so elsewhere.
  if (days.size === 0) return null

  const regions = Object.fromEntries([...days].map(([region, since]) => [region, glow(since)]))
  const cold = coldest(days)
  const name = (region: string) =>
    t(`pages.dashboard.regions.${region}` as 'pages.dashboard.regions.chest')

  // Four sentences, because "0 days ago" is not one anybody says and "the
  // coldest region is today" is not worth a line at all.
  const line =
    cold === null
      ? null
      : cold.days === null
        ? t('pages.dashboard.recency.never', { region: name(cold.region) })
        : cold.days >= COLD_AFTER_DAYS
          ? t('pages.dashboard.recency.cold', { region: name(cold.region) })
          : cold.days < 2
            ? t('pages.dashboard.recency.fresh')
            : t('pages.dashboard.recency.longest', {
                region: name(cold.region),
                count: cold.days,
              })

  return (
    // No container. A body in a bordered rectangle is a diagram in a report;
    // a body on the ground is the screen's subject.
    <div className="flex flex-col items-center gap-4">
      <MuscleMap
        regions={regions}
        reveal
        label={
          line ? `${t('pages.dashboard.recency.label')} — ${line}` : t('pages.dashboard.recency.label')
        }
        className="h-72"
      />

    </div>
  )
}

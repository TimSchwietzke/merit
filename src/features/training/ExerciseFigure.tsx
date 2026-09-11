import { MuscleMap } from '@/components/MuscleMap'
import { onBody, worksRegions } from '@/lib/muscles'
import type { ExerciseRef } from '@/features/training/useWorkout'

/**
 * What an exercise looks like, the picture beside its name.
 *
 * One slot, two sources. If a schematic exists for this lift it is shown; if
 * not, the body with its worked muscles filled in stands in. Today that is
 * always the second, because `image_url` is empty on every row: no set of
 * exercise schematics exists under a licence worth having, and the photographs
 * that do exist would drag a gym into an interface that is warm black, moss and
 * mono numerals.
 *
 * The fallback is not a placeholder. It is a real answer to what somebody scans
 * a catalogue for, it is present for all nine hundred lifts rather than the
 * third of them a photo set would cover, and it is drawn from the app's own
 * tokens so it cannot look borrowed. When schematics do arrive they drop into
 * `image_url` and nothing here changes.
 */
export function ExerciseFigure({
  exercise,
  label,
  className = 'h-24',
}: {
  exercise: Pick<ExerciseRef, 'primaryMuscles' | 'secondaryMuscles'> & {
    imageUrl?: string | null
  }
  /** Names the picture. The exercise's own name in the reader's language. */
  label: string
  className?: string
}) {
  if (exercise.imageUrl) {
    return (
      <img
        src={exercise.imageUrl}
        alt={label}
        loading="lazy"
        className={`${className} w-auto rounded-md object-contain`}
      />
    )
  }

  return (
    <MuscleMap
      regions={worksRegions(onBody(exercise.primaryMuscles), onBody(exercise.secondaryMuscles))}
      label={label}
      className={className}
    />
  )
}

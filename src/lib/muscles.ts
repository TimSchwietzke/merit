/**
 * The catalogue's muscle names, and where they land on the body map.
 *
 * Two vocabularies meet here. The exercise data names seventeen muscles the way
 * a lifter does, `lats`, `traps`, `quadriceps`; the silhouette names the
 * regions it can draw. Neither is wrong and neither is going to change, so the
 * translation is written down once rather than guessed at each call site.
 *
 * `lats` and `middle back` both land on `upper-back`, and `abductors` on
 * `gluteal`: the map draws regions, not individual muscles, and a region that
 * lights up for two neighbouring muscles is honest about what it can show.
 */
export const MUSCLES = [
  'abdominals',
  'abductors',
  'adductors',
  'biceps',
  'calves',
  'chest',
  'forearms',
  'glutes',
  'hamstrings',
  'lats',
  'lower back',
  'middle back',
  'neck',
  'quadriceps',
  'shoulders',
  'traps',
  'triceps',
] as const

export type Muscle = (typeof MUSCLES)[number]

const ON_BODY: Record<Muscle, string> = {
  abdominals: 'abs',
  abductors: 'gluteal',
  adductors: 'adductors',
  biceps: 'biceps',
  calves: 'calves',
  chest: 'chest',
  forearms: 'forearm',
  glutes: 'gluteal',
  hamstrings: 'hamstring',
  lats: 'upper-back',
  'lower back': 'lower-back',
  'middle back': 'upper-back',
  neck: 'neck',
  quadriceps: 'quadriceps',
  shoulders: 'deltoids',
  traps: 'trapezius',
  triceps: 'triceps',
}

/** Catalogue muscles as silhouette regions, de-duplicated. */
export function onBody(muscles: readonly string[]): string[] {
  const regions = new Set<string>()
  for (const muscle of muscles) {
    const region = ON_BODY[muscle as Muscle]
    if (region) regions.add(region)
  }
  return [...regions]
}

/**
 * The coarse group a muscle belongs to, the eight the catalogue is filtered
 * and grouped by (§10.11). Seventeen filter options is a list nobody reads.
 */
const GROUP: Record<Muscle, string> = {
  chest: 'chest',
  lats: 'back',
  'middle back': 'back',
  'lower back': 'back',
  traps: 'back',
  shoulders: 'shoulders',
  neck: 'shoulders',
  biceps: 'arms',
  triceps: 'arms',
  forearms: 'arms',
  quadriceps: 'legs',
  hamstrings: 'legs',
  calves: 'legs',
  adductors: 'legs',
  abductors: 'legs',
  glutes: 'glutes',
  abdominals: 'core',
}

/** Which of Merit's eight groups an exercise belongs in, from its primaries. */
export function groupOf(primary: readonly string[]): string {
  const groups = new Set(primary.map((muscle) => GROUP[muscle as Muscle]).filter(Boolean))
  if (groups.size === 0) return 'full_body'
  if (groups.size > 2) return 'full_body'
  // The first primary decides; a lift is filed under what it is mainly for.
  return GROUP[primary[0] as Muscle] ?? 'full_body'
}

/**
 * An exercise's muscles as the body map's intensities: full for what it works,
 * a little under half for what it helps with.
 *
 * Two states expressed in the continuous vocabulary the map takes, so the
 * dashboard's recency shading and an exercise's two categories are the same
 * kind of thing to the component drawing them.
 */
export function worksRegions(
  primary: readonly string[],
  secondary: readonly string[] = [],
): Record<string, number> {
  const regions: Record<string, number> = {}
  for (const slug of secondary) regions[slug] = 0.45
  for (const slug of primary) regions[slug] = 1
  return regions
}

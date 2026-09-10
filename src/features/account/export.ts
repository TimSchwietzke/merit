import { supabase } from '@/lib/supabase'

/**
 * Everything this account holds, as one JSON file (GDPR Art. 15 and Art. 20).
 *
 * Article 20 asks for a *structured, commonly used, machine-readable* format,
 * which is the whole specification: JSON, one key per table, rows as they are
 * stored rather than as a screen renders them. It is not a report — it is the
 * data, so that somebody can take it somewhere else or read it themselves.
 *
 * No server code and no new endpoint. Row Level Security already scopes every
 * one of these tables to the caller, so the export is just the queries the app
 * makes anyway with nothing narrowing them, and the same policies that stop one
 * user reading another's rows stop the export leaking them.
 *
 * The shared catalogues are deliberately absent. A food or an exercise somebody
 * added belongs to the group (GOAL.md §3), and those rows are not personal data
 * about the person who typed them once `created_by` is released — which is what
 * deletion does. Including everybody's catalogue in one person's export would
 * hand them other people's contributions.
 */
export interface ExportFile {
  /** Which shape this file is in, so a later reader knows what to expect. */
  format: 'merit.export.v1'
  exportedAt: string
  account: { id: string; email: string | null }
  profile: unknown
  weightLogs: unknown[]
  foodLogs: unknown[]
  nutritionGoals: unknown[]
  routines: unknown[]
  scheduledSessions: unknown[]
  workouts: unknown[]
  workoutSets: unknown[]
}

export async function buildExport(): Promise<ExportFile | null> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null

  // One round trip each, in parallel: the file is assembled once, by hand, and
  // waiting for seven sequential queries on a phone connection is a spinner
  // nobody needs to see.
  const [profile, weight, food, goals, routines, scheduled, workouts, sets] = await Promise.all([
    supabase.from('profiles').select('*').maybeSingle(),
    supabase.from('weight_logs').select('*').order('date'),
    supabase.from('food_logs').select('*').order('date'),
    supabase.from('nutrition_goals').select('*').order('valid_from'),
    supabase.from('routines').select('*, routine_days (*), routine_exercises (*)').order('position'),
    supabase.from('scheduled_sessions').select('*').order('scheduled_date'),
    supabase.from('workouts').select('*').order('date'),
    supabase.from('workout_sets').select('*'),
  ])

  return {
    format: 'merit.export.v1',
    exportedAt: new Date().toISOString(),
    account: { id: auth.user.id, email: auth.user.email ?? null },
    profile: profile.data ?? null,
    weightLogs: weight.data ?? [],
    foodLogs: food.data ?? [],
    nutritionGoals: goals.data ?? [],
    routines: routines.data ?? [],
    scheduledSessions: scheduled.data ?? [],
    workouts: workouts.data ?? [],
    workoutSets: sets.data ?? [],
  }
}

/**
 * Hand the file to the browser.
 *
 * A blob and an object URL rather than a data URI: an export of a year's
 * logging is megabytes, and a data URI that long is refused by some browsers
 * and truncated by others. The URL is revoked on the next tick — the download
 * has started by then, and leaving it alive keeps the whole file in memory for
 * as long as the tab is open.
 */
export function download(file: ExportFile, name: string): void {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

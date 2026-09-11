import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Check, Plus, X } from 'lucide-react'

import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Row, Rows } from '@/components/Rows'
import { SectionHead } from '@/components/SectionHead'
import { Button } from '@/components/ui/button'
import { Confirm } from '@/components/ui/confirm'
import { Sheet } from '@/components/ui/sheet'
import { plannable, useRoutines } from '@/features/routines/useRoutines'
import { useSchedule } from '@/features/training/useSchedule'
import { useWorkout } from '@/features/training/useWorkout'
import { todayKey } from '@/lib/date'
import { formatDayShort } from '@/lib/format'
import { addTo, removeFrom, replaceOn, upcomingInstances, weekOf } from '@/lib/schedule'

/**
 * A session before it starts.
 *
 * Nothing is written until Start, so this is where a day gets adjusted for what
 * is actually going to happen: a set fewer, an exercise dropped, or a different
 * training day altogether. Changing which routine the day runs lives here
 * rather than on the calendar, because this is already the screen that means
 * "today, adjusted", and it keeps the calendar's move control to one meaning.
 *
 * A change is kept for today, for every future session, or for a set of days
 * picked by hand. The pattern itself is only touched by the middle one.
 */
interface PlannedExercise {
  routineExerciseId: string
  exerciseId: string
  name: string
  /** Reps per set, in order. Dropping a set is dropping one of these. */
  setReps: number[]
}

type Scope = 'today' | 'always' | 'pick'

export default function SessionPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const today = todayKey()
  const date = params.get('date') ?? today
  const routineId = params.get('routine')

  const { routines, status, updateExercise, removeExercise } = useRoutines()
  const week = weekOf(date)
  const { overrides, apply, reload } = useSchedule(week[0], week[6], plannable(routines))
  const { startRoutine } = useWorkout(date)

  const routine = routines.find((entry) => entry.id === routineId)

  const [plan, setPlan] = useState<PlannedExercise[] | null>(null)
  const [changed, setChanged] = useState(false)
  const [scopeOpen, setScopeOpen] = useState(false)
  const [pickOpen, setPickOpen] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const [swapOpen, setSwapOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  if (status === 'loading') {
    return <p className="font-mono text-2xs text-ink-faint">{t('common.loading')}</p>
  }
  if (!routine || !routineId) {
    return (
      <p role="alert" className="text-sm text-danger">
        {t('pages.routines.loadFailed')}
      </p>
    )
  }

  // The routine's own plan until somebody changes it for this day.
  const current: PlannedExercise[] =
    plan ??
    routine.exercises.map((entry) => ({
      routineExerciseId: entry.id,
      exerciseId: entry.exerciseId,
      name: locale === 'de' ? entry.exercise.nameDe : entry.exercise.nameEn,
      setReps: entry.setReps,
    }))

  const edit = (next: PlannedExercise[]) => {
    setPlan(next)
    setChanged(true)
  }

  const asPlan = () =>
    current.map((entry) => ({ exerciseId: entry.exerciseId, setReps: entry.setReps }))

  /**
   * Write the adjusted plan as far as the chosen scope reaches, then start the
   * day if it is today.
   *
   * `today` writes nothing beyond the day itself: materialising the plan as it
   * stands *is* the change, and the routine is left alone by construction.
   */
  async function commit(scope: Scope, days: string[] = []) {
    setPending(true)
    setFailed(false)

    if (scope === 'always') {
      for (const entry of current) {
        await updateExercise(entry.routineExerciseId, entry.setReps)
      }
      const dropped = routine!.exercises.filter(
        (entry) => !current.some((kept) => kept.routineExerciseId === entry.id),
      )
      for (const entry of dropped) await removeExercise(entry.id)
    }

    // Picked days get the adjusted plan written onto them now, as a session
    // waiting to be done. It needs no table of its own: a workout with nothing
    // logged yet is exactly what "this day, planned differently" is.
    if (scope === 'pick') {
      for (const day of days) {
        const ok = await startRoutine({ routineId: routineId as string, exercises: asPlan(), forDate: day })
        if (!ok) {
          setPending(false)
          setFailed(true)
          return
        }
      }
    }

    if (date === today) {
      const ok = await startRoutine({ routineId: routineId as string, exercises: asPlan() })
      if (!ok) {
        setPending(false)
        setFailed(true)
        return
      }
      setPending(false)
      navigate(`/training/day?date=${date}`)
      return
    }

    setPending(false)
    setChanged(false)
    reload()
  }

  /**
   * Starting a session planned for another day moves it to today, which is the
   * ordinary case of "I could not go on Monday". It asks first, because it
   * takes the session off the day it was on.
   */
  async function moveHere() {
    const moved = await apply([
      ...removeFrom(overrides, routineId as string, date),
      ...addTo(overrides, routineId as string, today),
    ])
    if (!moved) {
      setFailed(true)
      return
    }
    const ok = await startRoutine({ routineId: routineId as string, exercises: asPlan(), forDate: today })
    if (!ok) {
      setFailed(true)
      return
    }
    navigate(`/training/day?date=${today}`)
  }

  /** The one button. It asks first only when there is something to ask about. */
  function primary() {
    if (date !== today) return setMoveOpen(true)
    if (changed) return setScopeOpen(true)
    void commit('today')
  }

  const instances = upcomingInstances(
    routines.map((r) => ({ id: r.id, name: r.name, weekdays: r.weekdays })),
    overrides,
    routineId,
    date,
  )

  return (
    <>
      <PageHeader title={routine.name} lead={formatDayShort(date, locale)} />

      <section>
        <SectionHead
          label={t('pages.training.session.label')}
          hint={changed ? t('pages.training.session.unsaved') : null}
        />

        {current.length === 0 ? (
          <EmptyState>{t('pages.training.session.empty')}</EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {current.map((entry) => (
              <li
                key={entry.routineExerciseId}
                className="overflow-hidden rounded-lg border border-line bg-surface"
              >
                <div className="flex items-center gap-3 border-b border-line bg-surface-2 px-4 py-3">
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                    {entry.name}
                  </p>
                  {/* An icon, not a sentence. "Not today" was two words doing
                      what one glyph does, on a row that has no space for it. */}
                  <Button
                    variant="bare"
                    size="icon"
                    aria-label={t('pages.training.session.removeExercise')}
                    onClick={() =>
                      edit(current.filter((row) => row.routineExerciseId !== entry.routineExerciseId))
                    }
                  >
                    <X />
                  </Button>
                </div>

                <ul>
                  {entry.setReps.map((reps, index) => (
                    <li
                      key={index}
                      className="flex items-center gap-3 border-b border-line px-4 py-2 last:border-b-0"
                    >
                      <span className="w-12 shrink-0 font-mono text-2xs text-ink-faint">
                        {t('pages.routines.editor.setN', { n: index + 1 })}
                      </span>
                      <span className="min-w-0 flex-1 font-mono text-sm tabular-nums text-ink">
                        {reps}
                      </span>
                      <Button
                        variant="bare"
                        size="icon"
                        aria-label={t('pages.routines.editor.removeSet', { n: index + 1 })}
                        disabled={entry.setReps.length <= 1}
                        onClick={() =>
                          edit(
                            current.map((row) =>
                              row.routineExerciseId === entry.routineExerciseId
                                ? { ...row, setReps: row.setReps.filter((_, i) => i !== index) }
                                : row,
                            ),
                          )
                        }
                      >
                        <X />
                      </Button>
                    </li>
                  ))}
                </ul>

                <Button
                  variant="bare"
                  size="small"
                  className="m-2"
                  onClick={() =>
                    edit(
                      current.map((row) =>
                        row.routineExerciseId === entry.routineExerciseId
                          ? {
                              ...row,
                              setReps: [...row.setReps, row.setReps[row.setReps.length - 1] ?? 8],
                            }
                          : row,
                      ),
                    )
                  }
                >
                  <Plus size={15} strokeWidth={1.75} aria-hidden />
                  {t('pages.training.session.addSet')}
                </Button>
              </li>
            ))}
          </ul>
        )}

        {failed ? (
          <p role="alert" className="mt-3 text-sm text-danger">
            {t('pages.training.session.startFailed')}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-3">
          <Button variant="primary" pending={pending} onClick={primary}>
            {pending ? t('pages.training.session.starting') : t('pages.training.session.start')}
          </Button>
          <Button variant="quiet" onClick={() => setSwapOpen(true)}>
            {t('pages.training.session.changeRoutine')}
          </Button>
        </div>
      </section>

      <Link
        to="/training"
        className="mt-8 inline-flex min-h-11 items-center font-mono text-2xs text-accent underline decoration-1 underline-offset-2"
      >
        ← {t('nav.training')}
      </Link>

      {/* Which routine this day runs. Replacing drops the displaced one from
          this date only; the pattern is untouched, so it is back next week. */}
      <Confirm
        open={moveOpen}
        onOpenChange={setMoveOpen}
        question={t('pages.training.session.moveHere')}
        confirmLabel={t('pages.training.session.moveConfirm')}
        cancelLabel={t('common.close')}
        onConfirm={() => void moveHere()}
      >
        <p className="mt-2 max-w-[46ch] text-sm text-ink-muted">
          {t('pages.training.session.moveHereBody', {
            name: routine.name,
            day: formatDayShort(date, locale),
          })}
        </p>
      </Confirm>

      <Sheet
        open={swapOpen}
        onOpenChange={setSwapOpen}
        title={t('pages.training.session.changeRoutineTitle')}
        closeLabel={t('common.close')}
      >
        <Rows>
          {routines
            .filter((entry) => entry.id !== routineId)
            .map((entry) => (
              <Row
                key={entry.id}
                onClick={() => {
                  void apply(replaceOn(overrides, date, routineId as string, entry.id)).then(() => {
                    reload()
                    setSwapOpen(false)
                    navigate(`/training/session?date=${date}&routine=${entry.id}`)
                  })
                }}
              >
                <span className="min-w-0 flex-1 truncate">{entry.name}</span>
                <span className="shrink-0 font-mono text-2xs text-ink-faint">
                  {t('pages.routines.exerciseCount', { count: entry.exercises.length })}
                </span>
              </Row>
            ))}
        </Rows>
      </Sheet>

      <Sheet
        open={scopeOpen}
        onOpenChange={setScopeOpen}
        title={t('pages.training.session.scopeTitle')}
        closeLabel={t('common.close')}
      >
        <Rows>
          {(
            [
              ['today', 'scopeToday', 'scopeTodayHint'],
              ['always', 'scopeAlways', 'scopeAlwaysHint'],
              ['pick', 'scopePick', 'scopePickHint'],
            ] as const
          ).map(([scope, label, hint]) => (
            <Row
              key={scope}
              onClick={() => {
                setScopeOpen(false)
                if (scope === 'pick') {
                  setPickOpen(true)
                  return
                }
                void commit(scope)
              }}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate">{t(`pages.training.session.${label}`)}</span>
                <span className="block truncate font-mono text-2xs text-ink-faint">
                  {t(`pages.training.session.${hint}`)}
                </span>
              </span>
            </Row>
          ))}
        </Rows>
      </Sheet>

      {/* The instances, as a list of the days this routine actually falls on.
          Selected is `accent`, the rest are `ink`, §2.4 rules out a second
          hue, and three weights carry the same three states. */}
      <Sheet
        open={pickOpen}
        onOpenChange={setPickOpen}
        title={t('pages.training.session.pickTitle')}
        closeLabel={t('common.close')}
      >
        <Rows>
          {instances.map((day) => {
            const on = picked.includes(day)
            return (
              <Row
                key={day}
                onClick={() =>
                  setPicked(on ? picked.filter((d) => d !== day) : [...picked, day])
                }
              >
                <span className={`min-w-0 flex-1 truncate ${on ? 'text-accent' : 'text-ink'}`}>
                  {formatDayShort(day, locale)}
                </span>
                {on ? <Check size={14} strokeWidth={2} className="shrink-0 text-accent" /> : null}
              </Row>
            )
          })}
        </Rows>
        <Button
          variant="primary"
          className="mt-4 w-full"
          disabled={picked.length === 0}
          onClick={() => {
            setPickOpen(false)
            void commit('pick', picked)
          }}
        >
          {t('pages.training.session.pickDone', { count: picked.length })}
        </Button>
      </Sheet>
    </>
  )
}

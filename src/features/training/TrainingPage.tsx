import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { Check, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { EmptyState } from '@/components/EmptyState'
import { NumberField } from '@/components/NumberField'
import { RowBody, Rows } from '@/components/Rows'
import { ScreenTitle } from '@/components/ScreenTitle'
import { SectionHead } from '@/components/SectionHead'
import { SwipeRow } from '@/components/SwipeRow'
import { Button } from '@/components/ui/button'
import { useRoutines, type Routine } from '@/features/routines/useRoutines'
import { useExercise } from '@/features/training/useExercise'
import { useWorkout, type ExerciseRef } from '@/features/training/useWorkout'
import { addDays, parseDateKey, todayKey } from '@/lib/date'
import { formatDayLong, formatNumber, parseDecimalInput, weekdayLabel } from '@/lib/format'
import {
  groupSets,
  lastSessionFor,
  performed,
  repeatOf,
  volume,
  type LoggedSet,
  type SessionSets,
} from '@/lib/training'

const REPS_LIMITS = { min: 1, max: 1000, decimals: 0 } as const
const WEIGHT_LIMITS = { min: 0, max: 1000, decimals: 2 } as const
const RIR_LIMITS = { min: 0, max: 10, decimals: 0 } as const

/** `3 × 8 @ 60 kg`, or several such lines. */
function summarise(sets: readonly LoggedSet[], locale: string): string {
  return groupSets(sets)
    .map((group) => `${group.sets} × ${group.reps} @ ${formatNumber(group.weightKg, locale, 0)} kg`)
    .join(' · ')
}

/**
 * The training day.
 *
 * A day with nothing on it offers the training days to start; starting one
 * writes its plan onto the day as sets that have not been done yet. From there
 * the screen is a list of sets to work through: a tick to confirm one as it
 * stands, a tap to change it, a swipe to remove it, and a `+` for a set the plan
 * did not know about.
 *
 * There is no longer a form per exercise. Everything a set needs is in the row
 * it already has, which is fewer controls and, standing between two sets, fewer
 * things to aim at.
 */
export default function TrainingPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const [params, setParams] = useSearchParams()

  const today = todayKey()
  const date = params.get('date') ?? today
  const { sets, exercises, history, status, addSet, updateSet, removeSet, startRoutine } =
    useWorkout(date)
  const [openRow, setOpenRow] = useState<string | null>(null)

  const pickedId = params.get('exercise')
  const picked = useExercise(pickedId)

  const goto = (next: string) => setParams(next === today ? {} : { date: next })

  const order: string[] = []
  for (const set of sets) if (!order.includes(set.exerciseId)) order.push(set.exerciseId)
  if (picked && !order.includes(picked.id)) order.push(picked.id)

  async function onRemove(set: LoggedSet) {
    if (!(await removeSet(set.id))) return
    toast(t('pages.training.deleted'), {
      action: {
        label: t('common.undo'),
        onClick: () => {
          void addSet({
            exerciseId: set.exerciseId,
            reps: set.reps,
            weightKg: set.weightKg,
            rir: set.rir,
            done: set.done,
          }).then((ok) => {
            if (!ok) toast(t('pages.training.undoFailed'))
          })
        },
      },
    })
  }

  return (
    <>
      <ScreenTitle>{t('nav.training')}</ScreenTitle>

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="bare"
          size="icon"
          aria-label={t('pages.food.day.previous')}
          onClick={() => goto(addDays(date, -1))}
        >
          <ChevronLeft />
        </Button>
        <p className="min-w-0 truncate text-center font-mono text-2xs text-ink">
          {date === today ? t('common.today') : formatDayLong(date, locale)}
        </p>
        <Button
          variant="bare"
          size="icon"
          aria-label={t('pages.food.day.next')}
          disabled={date >= today}
          onClick={() => goto(addDays(date, 1))}
        >
          <ChevronRight />
        </Button>
      </div>

      <div className="mt-6">
        {status === 'error' ? (
          <p role="alert" className="text-sm text-danger">
            {t('pages.training.loadFailed')}
          </p>
        ) : status === 'loading' ? (
          <p className="font-mono text-2xs text-ink-faint">{t('common.loading')}</p>
        ) : order.length === 0 ? (
          <StartSession date={date} locale={locale} onStart={startRoutine} />
        ) : (
          <>
            {order.map((exerciseId) => (
              <Exercise
                key={exerciseId}
                exercise={
                  exercises.get(exerciseId) ?? (picked?.id === exerciseId ? picked : undefined)
                }
                sets={sets.filter((set) => set.exerciseId === exerciseId)}
                history={history}
                date={date}
                locale={locale}
                openRow={openRow}
                onOpenRow={setOpenRow}
                onRemove={onRemove}
                onAdd={addSet}
                onUpdate={updateSet}
              />
            ))}

            <Button asChild variant="primary" className="mt-6 w-full md:w-auto">
              <Link to={`/training/add?date=${date}`}>{t('pages.training.addExercise')}</Link>
            </Button>
          </>
        )}
      </div>
    </>
  )
}

/**
 * What a day with nothing on it offers: the training day that is due, the
 * others, and a session with no plan at all — which §7 of GOAL.md requires stay
 * possible.
 */
function StartSession({
  date,
  locale,
  onStart,
}: {
  date: string
  locale: string
  onStart: (plan: {
    routineId: string
    exercises: { exerciseId: string; targetSets: number; targetReps: number }[]
  }) => Promise<boolean>
}) {
  const { t } = useTranslation()
  const { routines, status } = useRoutines()
  const [pending, setPending] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  // ISO weekday of the day being looked at, 1 = Monday.
  const weekday = ((parseDateKey(date).getDay() + 6) % 7) + 1
  const due = routines.filter((routine) => routine.weekdays.includes(weekday))
  const others = routines.filter((routine) => !routine.weekdays.includes(weekday))

  async function start(routine: Routine) {
    setPending(routine.id)
    setFailed(false)
    const ok = await onStart({
      routineId: routine.id,
      exercises: routine.exercises.map((entry) => ({
        exerciseId: entry.exerciseId,
        targetSets: entry.targetSets,
        targetReps: entry.targetReps,
      })),
    })
    setPending(null)
    if (!ok) setFailed(true)
  }

  const row = (routine: Routine) => (
    <li key={routine.id}>
      <RowBody onClick={() => void start(routine)}>
        <span className="min-w-0 flex-1">
          <span className="block truncate">{routine.name}</span>
          <span className="block truncate font-mono text-2xs text-ink-faint">
            {t('pages.routines.exerciseCount', { count: routine.exercises.length })}
            {routine.weekdays.length > 0
              ? ` · ${routine.weekdays.map((day) => weekdayLabel(day, locale)).join(' ')}`
              : ''}
          </span>
        </span>
        <span className="shrink-0 font-mono text-2xs text-ink-faint">
          {pending === routine.id ? t('pages.training.start.starting') : '→'}
        </span>
      </RowBody>
    </li>
  )

  return (
    <>
      {status === 'loading' ? (
        <p className="font-mono text-2xs text-ink-faint">{t('common.loading')}</p>
      ) : (
        <>
          {due.length > 0 ? (
            <section className="mb-6">
              <SectionHead label={t('pages.training.start.due')} />
              <Rows>{due.map(row)}</Rows>
            </section>
          ) : null}

          {others.length > 0 ? (
            <section className="mb-6">
              <SectionHead
                label={due.length > 0 ? t('pages.training.start.other') : t('pages.training.start.label')}
              />
              <Rows>{others.map(row)}</Rows>
            </section>
          ) : null}

          {routines.length === 0 ? <EmptyState>{t('pages.training.empty')}</EmptyState> : null}

          {failed ? (
            <p role="alert" className="mb-3 text-sm text-danger">
              {t('pages.training.start.startFailed')}
            </p>
          ) : null}

          <div className="flex flex-col gap-3 md:flex-row">
            {/* Free logging stays a first-class way in (GOAL.md §7). */}
            <Button asChild variant="primary">
              <Link to={`/training/add?date=${date}`}>{t('pages.training.start.free')}</Link>
            </Button>
            <Button asChild variant="quiet">
              <Link to="/training/routines">{t('pages.training.start.manage')}</Link>
            </Button>
          </div>
        </>
      )}
    </>
  )
}

function Exercise({
  exercise,
  sets,
  history,
  date,
  locale,
  openRow,
  onOpenRow,
  onRemove,
  onAdd,
  onUpdate,
}: {
  exercise: ExerciseRef | undefined
  sets: LoggedSet[]
  history: SessionSets[]
  date: string
  locale: string
  openRow: string | null
  onOpenRow: (id: string | null) => void
  onRemove: (set: LoggedSet) => void
  onAdd: (set: {
    exerciseId: string
    reps: number
    weightKg: number
    rir: number | null
    done?: boolean
  }) => Promise<boolean>
  onUpdate: (
    id: string,
    values: { reps: number; weightKg: number; rir: number | null; done: boolean },
  ) => Promise<boolean>
}) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  if (!exercise) return null

  const name = locale === 'de' ? exercise.nameDe : exercise.nameEn
  const last = lastSessionFor(history, exercise.id, date)
  const doneCount = performed(sets).length

  async function addOne() {
    const previous = repeatOf(sets, exercise!.id) ?? sets[sets.length - 1] ?? null
    setAdding(true)
    await onAdd({
      exerciseId: exercise!.id,
      reps: previous?.reps ?? 8,
      weightKg: previous?.weightKg ?? 0,
      rir: null,
      // A set added by hand is one being done now, not one being planned.
      done: true,
    })
    setAdding(false)
  }

  return (
    <section className="mb-6 last:mb-0">
      <div className="mb-3 flex items-baseline justify-between gap-4 border-b border-line pb-2">
        <h2 className="min-w-0 truncate text-sm text-ink">{name}</h2>
        <span className="shrink-0 font-mono text-2xs text-ink-faint">
          {doneCount}/{sets.length} · {t('pages.training.volume', { volume: formatNumber(volume(sets), locale, 0) })}
        </span>
      </div>

      <Rows>
        {sets.map((set, index) => (
          <SwipeRow
            key={set.id}
            open={openRow === set.id}
            onOpenChange={(open) => onOpenRow(open ? set.id : null)}
            label={t('pages.training.swipe')}
            actions={
              <button
                type="button"
                onClick={() => {
                  onOpenRow(null)
                  onRemove(set)
                }}
                className="flex w-full items-center justify-center bg-danger px-3 text-sm font-medium text-bg"
              >
                {t('pages.training.remove')}
              </button>
            }
          >
            {editing === set.id ? (
              <SetEditor
                set={set}
                index={index}
                locale={locale}
                onCancel={() => setEditing(null)}
                onSave={async (values) => {
                  await onUpdate(set.id, values)
                  setEditing(null)
                }}
              />
            ) : (
              <div className="flex items-stretch">
                {/* One tap for the common case: the set as planned, done. */}
                <button
                  type="button"
                  aria-label={t(set.done ? 'pages.training.setRow.undone' : 'pages.training.setRow.done')}
                  aria-pressed={set.done}
                  onClick={() =>
                    void onUpdate(set.id, {
                      reps: set.reps,
                      weightKg: set.weightKg,
                      rir: set.rir,
                      done: !set.done,
                    })
                  }
                  className="flex min-h-[52px] w-12 shrink-0 items-center justify-center"
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-sm border
                                ${set.done ? 'border-accent bg-accent text-bg' : 'border-line-strong text-transparent'}`}
                  >
                    <Check size={13} strokeWidth={2.5} aria-hidden />
                  </span>
                </button>

                <RowBody onClick={() => setEditing(set.id)}>
                  <span className="w-4 shrink-0 font-mono text-2xs tabular-nums text-ink-faint">
                    {index + 1}
                  </span>
                  {/* A planned set is stated in `ink-faint`; doing it promotes
                      it. No second colour, no badge (§2.4). */}
                  <span
                    className={`min-w-0 flex-1 font-mono text-sm tabular-nums ${
                      set.done ? 'text-ink' : 'text-ink-faint'
                    }`}
                  >
                    {set.reps} × {formatNumber(set.weightKg, locale, set.weightKg % 1 === 0 ? 0 : 1)} kg
                    {set.rir === null ? null : (
                      <span className="ml-2 text-2xs text-ink-faint">rir {set.rir}</span>
                    )}
                  </span>
                </RowBody>
              </div>
            )}
          </SwipeRow>
        ))}

        {/* The `+` that replaced the form. */}
        <li>
          <button
            type="button"
            onClick={() => void addOne()}
            disabled={adding}
            className="flex min-h-[52px] w-full items-center gap-3 px-4 py-3 text-left font-mono text-2xs
                       text-ink-muted transition-colors hover:bg-surface-2 active:bg-surface-2
                       [transition-duration:140ms] active:[transition-duration:0ms] disabled:opacity-35"
          >
            <Plus size={15} strokeWidth={1.75} aria-hidden className="shrink-0" />
            {t('pages.training.setRow.add')}
          </button>
        </li>
      </Rows>

      <p className="mt-2 font-mono text-2xs text-ink-faint">
        {last ? (
          <>
            {t('pages.training.lastTime')}{' '}
            <span className="text-ink">{summarise(last.sets, locale)}</span>
          </>
        ) : (
          t('pages.training.never')
        )}
      </p>
    </section>
  )
}

/** The row, turned into its own editor. */
function SetEditor({
  set,
  index,
  locale,
  onSave,
  onCancel,
}: {
  set: LoggedSet
  index: number
  locale: string
  onSave: (values: { reps: number; weightKg: number; rir: number | null; done: boolean }) => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const [reps, setReps] = useState(String(set.reps))
  const [weight, setWeight] = useState(
    formatNumber(set.weightKg, locale, set.weightKg % 1 === 0 ? 0 : 1),
  )
  const [rir, setRir] = useState(set.rir === null ? '' : String(set.rir))
  const [error, setError] = useState(false)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsedReps = parseDecimalInput(reps, REPS_LIMITS)
    const parsedWeight = parseDecimalInput(weight, WEIGHT_LIMITS)
    const parsedRir = rir.trim() === '' ? null : parseDecimalInput(rir, RIR_LIMITS)

    if (parsedReps === null || parsedWeight === null || (rir.trim() !== '' && parsedRir === null)) {
      setError(true)
      return
    }
    // Saving a set is also doing it: nobody edits a set they have not performed
    // and leaves it outstanding.
    onSave({ reps: parsedReps, weightKg: parsedWeight, rir: parsedRir, done: true })
  }

  return (
    <form onSubmit={submit} className="bg-surface-2 px-4 py-3" noValidate>
      <p className="sr-only">{t('pages.training.setRow.editing', { n: index + 1 })}</p>
      <div className="flex gap-2">
        <div className="flex-1">
          <NumberField
            id={`edit-reps-${set.id}`}
            label={t('pages.training.set.reps')}
            unit="×"
            value={reps}
            inputMode="numeric"
            onChange={(event) => setReps(event.target.value)}
            autoFocus
          />
        </div>
        <div className="flex-1">
          <NumberField
            id={`edit-weight-${set.id}`}
            label={t('pages.training.set.weight')}
            unit="kg"
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
          />
        </div>
        <div className="w-16">
          <NumberField
            id={`edit-rir-${set.id}`}
            label={t('pages.training.set.rir')}
            unit=""
            value={rir}
            inputMode="numeric"
            onChange={(event) => setRir(event.target.value)}
          />
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {t('pages.training.set.invalid')}
        </p>
      ) : null}

      <div className="mt-3 flex gap-2">
        <Button type="submit" variant="primary" size="small">
          {t('pages.training.setRow.save')}
        </Button>
        <Button type="button" variant="bare" size="small" onClick={onCancel}>
          {t('common.close')}
        </Button>
      </div>
    </form>
  )
}

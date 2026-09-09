import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { EmptyState } from '@/components/EmptyState'
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

          {routines.length === 0 ? (
            <section className="mb-6">
              <SectionHead label={t('pages.training.start.label')} />
              <EmptyState>{t('pages.routines.empty')}</EmptyState>
            </section>
          ) : null}

          {failed ? (
            <p role="alert" className="mb-3 text-sm text-danger">
              {t('pages.training.start.startFailed')}
            </p>
          ) : null}

          {/* Starting a training day is the way this screen is meant to be
              used, so with none defined the primary action is defining one.
              Once they exist the rows above *are* the primary action and
              neither button claims it (§10.4). Free logging stays a
              first-class way in either way (GOAL.md §7). */}
          <div className="flex flex-col gap-3 md:flex-row">
            <Button asChild variant={routines.length === 0 ? 'primary' : 'quiet'}>
              <Link to="/training/routines">
                {routines.length === 0
                  ? t('pages.routines.create')
                  : t('pages.training.start.manage')}
              </Link>
            </Button>
            <Button asChild variant="quiet">
              <Link to={`/training/add?date=${date}`}>{t('pages.training.start.free')}</Link>
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
  }) => Promise<boolean>
  onUpdate: (
    id: string,
    values: { reps: number; weightKg: number; rir: number | null },
  ) => Promise<boolean>
}) {
  const { t } = useTranslation()
  const [adding, setAdding] = useState(false)

  if (!exercise) return null

  const name = locale === 'de' ? exercise.nameDe : exercise.nameEn
  const last = lastSessionFor(history, exercise.id, date)

  /**
   * A new set starts from the one before it, because that is what usually
   * happens next — and never from zero, which is a weight nobody lifts and a
   * rep count nobody does.
   */
  async function addOne() {
    const previous = repeatOf(sets, exercise!.id)
    setAdding(true)
    await onAdd({
      exerciseId: exercise!.id,
      reps: previous?.reps ?? 8,
      weightKg: previous?.weightKg ?? 0,
      rir: previous?.rir ?? null,
    })
    setAdding(false)
  }

  return (
    // One bordered envelope per exercise. The block used to be a header rule, a
    // row list and three bordered inputs per set — ten hairlines of equal
    // weight, so nothing announced where one exercise ended and the next began.
    <section className="mb-6 overflow-hidden rounded-lg border border-line bg-surface last:mb-0">
      <div className="flex items-baseline justify-between gap-4 border-b border-line bg-surface-2 px-4 py-3">
        <h2 className="min-w-0 truncate text-base font-medium text-ink">{name}</h2>
        <span className="shrink-0 font-mono text-2xs text-ink-faint">
          {t('pages.training.volume', { volume: formatNumber(volume(sets), locale, 0) })}
        </span>
      </div>

      {/* The columns are named once, above the rows, instead of a label beside
          every field. Four exercises of three sets is thirty-six labels
          otherwise, saying the same three words. */}
      {sets.length > 0 ? (
        <div className="flex items-center gap-2 px-4 pt-3 font-mono text-2xs text-ink-faint">
          <span className="w-4 shrink-0" aria-hidden />
          <span className="flex-1 text-right">{t('pages.training.set.reps')}</span>
          <span className="flex-1 text-right">{t('pages.training.set.weight')}</span>
          <span className="w-16 shrink-0 text-right">{t('pages.training.set.rir')}</span>
        </div>
      ) : null}

      <ul>
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
            <SetRow
              set={set}
              index={index}
              exerciseName={name}
              locale={locale}
              onCommit={(values) => void onUpdate(set.id, values)}
            />
          </SwipeRow>
        ))}

        <li>
          <button
            type="button"
            onClick={() => void addOne()}
            disabled={adding}
            className="flex min-h-11 w-full items-center gap-3 px-4 py-2 text-left font-mono text-2xs
                       text-ink-muted transition-colors hover:bg-surface-2 active:bg-surface-2
                       [transition-duration:140ms] active:[transition-duration:0ms] disabled:opacity-35"
          >
            <Plus size={15} strokeWidth={1.75} aria-hidden className="shrink-0" />
            {t('pages.training.setRow.add')}
          </button>
        </li>
      </ul>

      {/* Inside the card, because it is a fact about this exercise. */}
      <p className="border-t border-line px-4 py-2.5 font-mono text-2xs text-ink-faint">
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

/**
 * A set, as three fields.
 *
 * There is no edit mode and nothing to open: every figure on this screen can be
 * changed where it stands. An editor that replaced the row meant the layout
 * moved under the thumb that opened it, and it meant reaching every set through
 * a tap that did nothing but make the row editable — which it may as well have
 * been all along.
 *
 * Committed on blur rather than on keystroke (§10.5). A value is written once
 * it is finished, not eight times while it is being typed.
 */
function SetRow({
  set,
  index,
  exerciseName,
  locale,
  onCommit,
}: {
  set: LoggedSet
  index: number
  /** Named in every field's label: `wdh 1` alone says nothing about which
   *  exercise it belongs to, and repeats once per block. */
  exerciseName: string
  locale: string
  onCommit: (values: { reps: number; weightKg: number; rir: number | null }) => void
}) {
  const { t } = useTranslation()
  const asTyped = (value: number) => formatNumber(value, locale, value % 1 === 0 ? 0 : 1)

  const [reps, setReps] = useState(String(set.reps))
  const [weight, setWeight] = useState(asTyped(set.weightKg))
  const [rir, setRir] = useState(set.rir === null ? '' : String(set.rir))
  const [invalid, setInvalid] = useState(false)

  function commit() {
    const parsedReps = parseDecimalInput(reps, REPS_LIMITS)
    const parsedWeight = parseDecimalInput(weight, WEIGHT_LIMITS)
    const parsedRir = rir.trim() === '' ? null : parseDecimalInput(rir, RIR_LIMITS)

    if (parsedReps === null || parsedWeight === null || (rir.trim() !== '' && parsedRir === null)) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    if (parsedReps === set.reps && parsedWeight === set.weightKg && parsedRir === set.rir) return
    onCommit({ reps: parsedReps, weightKg: parsedWeight, rir: parsedRir })
  }

  // Filled rather than outlined (§10.5): three bordered fields inside a bordered
  // row inside a bordered card is a mesh of hairlines with nothing heavier than
  // anything else. The focus ring does the work the border was doing.
  //
  // No `w-full`: it fights the flex sizing below, and the field that has it
  // wins the whole row while the others collapse to nothing.
  const field =
    `min-h-11 min-w-0 rounded-md px-2 text-right font-mono text-input tabular-nums text-ink
     transition-colors [transition-duration:140ms] md:min-h-9 md:text-sm ` +
    (invalid ? 'bg-danger/10 text-danger' : 'bg-surface-2')

  return (
    <div className="flex items-center gap-2 px-4 py-1.5">
      <span className="w-4 shrink-0 font-mono text-2xs tabular-nums text-ink-faint">{index + 1}</span>

      <input
        aria-label={`${exerciseName} ${t('pages.training.set.reps')} ${index + 1}`}
        inputMode="numeric"
        value={reps}
        onChange={(event) => setReps(event.target.value)}
        onBlur={commit}
        className={`${field} flex-1`}
      />
      <input
        aria-label={`${exerciseName} ${t('pages.training.set.weight')} ${index + 1}`}
        inputMode="decimal"
        value={weight}
        onChange={(event) => setWeight(event.target.value)}
        onBlur={commit}
        className={`${field} flex-1`}
      />
      <input
        aria-label={`${exerciseName} ${t('pages.training.set.rir')} ${index + 1}`}
        inputMode="numeric"
        value={rir}
        onChange={(event) => setRir(event.target.value)}
        onBlur={commit}
        className={`${field} w-16 shrink-0`}
      />
    </div>
  )
}

import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

import { EmptyState } from '@/components/EmptyState'
import { NumberField } from '@/components/NumberField'
import { RowBody, Rows } from '@/components/Rows'
import { ScreenTitle } from '@/components/ScreenTitle'
import { SwipeRow } from '@/components/SwipeRow'
import { Button } from '@/components/ui/button'
import { useExercise } from '@/features/training/useExercise'
import { useWorkout, type ExerciseRef } from '@/features/training/useWorkout'
import { addDays, todayKey } from '@/lib/date'
import { formatDayLong, formatNumber, parseDecimalInput } from '@/lib/format'
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
 * The training day: what was done, and the form to add the next set.
 *
 * The form for each exercise is on screen rather than behind a tap. §7 is
 * explicit that a logging screen hides nothing from somebody standing between
 * two sets, and it opens on the last set repeated — because between sets the
 * answer is almost always "the same again".
 */
export default function TrainingPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const [params, setParams] = useSearchParams()

  const today = todayKey()
  const date = params.get('date') ?? today
  const { sets, exercises, history, status, addSet, removeSet } = useWorkout(date)
  const [openRow, setOpenRow] = useState<string | null>(null)

  // An exercise just picked has no sets yet, so the day's own query does not
  // know its name. It is fetched on its own and its block appears empty, with
  // the form ready — which is the whole point of having picked it.
  const pickedId = params.get('exercise')
  const picked = useExercise(pickedId)

  const goto = (next: string) => setParams(next === today ? {} : { date: next })

  // In the order they were first logged, which is the order they were done in.
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
          <EmptyState>{t('pages.training.empty')}</EmptyState>
        ) : (
          order.map((exerciseId) => (
            <Exercise
              key={exerciseId}
              exercise={exercises.get(exerciseId) ?? (picked?.id === exerciseId ? picked : undefined)}
              sets={sets.filter((set) => set.exerciseId === exerciseId)}
              history={history}
              date={date}
              locale={locale}
              openRow={openRow}
              onOpenRow={setOpenRow}
              onRemove={onRemove}
              onAdd={addSet}
            />
          ))
        )}

        <Button asChild variant="primary" className="mt-6 w-full md:w-auto">
          <Link to={`/training/add?date=${date}`}>{t('pages.training.addExercise')}</Link>
        </Button>
      </div>
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
}) {
  const { t } = useTranslation()
  if (!exercise) return null

  const name = locale === 'de' ? exercise.nameDe : exercise.nameEn
  const last = lastSessionFor(history, exercise.id, date)

  return (
    <section className="mb-6 last:mb-0">
      {/* Not a SectionHead: that slot is a mono `ink-faint` *label*, and an
          exercise name is content. It keeps §10.3's shape — baseline-aligned,
          a rule beneath — and gives the name the weight a name should have. */}
      <div className="mb-3 flex items-baseline justify-between gap-4 border-b border-line pb-2">
        <h2 className="min-w-0 truncate text-sm text-ink">{name}</h2>
        <span className="shrink-0 font-mono text-2xs text-ink-faint">
          {t('pages.training.volume', { volume: formatNumber(volume(sets), locale, 0) })}
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
            {/* Tapping reveals what swiping reveals. A swipe is unreachable by
                keyboard and there is no set editor yet for it to hang off, so
                without this the only way to remove a set would be a gesture.
                Revealing is not destructive, so a tap may do it (§10.1).

                Position rather than the stored number: deleting the middle set
                of three leaves a hole in the numbering, and a list that reads
                1, 3 is a list that looks broken. */}
            <RowBody onClick={() => onOpenRow(openRow === set.id ? null : set.id)}>
              <span className="w-6 shrink-0 font-mono text-2xs tabular-nums text-ink-faint">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 font-mono text-sm tabular-nums text-ink">
                {set.reps} × {formatNumber(set.weightKg, locale, set.weightKg % 1 === 0 ? 0 : 1)} kg
                {set.rir === null ? null : (
                  <span className="ml-2 text-2xs text-ink-faint">rir {set.rir}</span>
                )}
              </span>
            </RowBody>
          </SwipeRow>
        ))}
      </Rows>

      {/* The reason anyone opens this tab between sets (§10.10). */}
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

      <AddSet exerciseId={exercise.id} sets={sets} locale={locale} onAdd={onAdd} />
    </section>
  )
}

function AddSet({
  exerciseId,
  sets,
  locale,
  onAdd,
}: {
  exerciseId: string
  sets: LoggedSet[]
  locale: string
  onAdd: (set: {
    exerciseId: string
    reps: number
    weightKg: number
    rir: number | null
  }) => Promise<boolean>
}) {
  const { t } = useTranslation()
  const previous = repeatOf(sets, exerciseId)

  const [reps, setReps] = useState(previous ? String(previous.reps) : '')
  const [weight, setWeight] = useState(
    previous ? formatNumber(previous.weightKg, locale, previous.weightKg % 1 === 0 ? 0 : 1) : '',
  )
  const [rir, setRir] = useState(previous?.rir === null || !previous ? '' : String(previous.rir))
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsedReps = parseDecimalInput(reps, REPS_LIMITS)
    const parsedWeight = parseDecimalInput(weight, WEIGHT_LIMITS)
    const parsedRir = rir.trim() === '' ? null : parseDecimalInput(rir, RIR_LIMITS)

    if (parsedReps === null || parsedWeight === null || (rir.trim() !== '' && parsedRir === null)) {
      setError(t('pages.training.set.invalid'))
      return
    }

    setError(null)
    setPending(true)
    const saved = await onAdd({
      exerciseId,
      reps: parsedReps,
      weightKg: parsedWeight,
      rir: parsedRir,
    })
    setPending(false)
    if (!saved) setError(t('pages.training.set.addFailed'))
  }

  return (
    <form onSubmit={submit} className="mt-3" noValidate>
      <div className="flex gap-3">
        <div className="flex-1">
          <NumberField
            id={`reps-${exerciseId}`}
            label={t('pages.training.set.reps')}
            unit="×"
            value={reps}
            onChange={(event) => setReps(event.target.value)}
            inputMode="numeric"
          />
        </div>
        <div className="flex-1">
          <NumberField
            id={`weight-${exerciseId}`}
            label={t('pages.training.set.weight')}
            unit="kg"
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
          />
        </div>
        <div className="w-20">
          <NumberField
            id={`rir-${exerciseId}`}
            label={t('pages.training.set.rir')}
            unit=""
            value={rir}
            onChange={(event) => setRir(event.target.value)}
            inputMode="numeric"
          />
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <Button type="submit" variant="tinted" pending={pending} className="mt-3 w-full">
        {pending ? t('pages.training.set.adding') : t('pages.training.set.add')}
      </Button>
    </form>
  )
}

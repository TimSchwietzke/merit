import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react'

import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Panel } from '@/components/Panel'
import { SectionHead } from '@/components/SectionHead'
import { SegmentedControl } from '@/components/SegmentedControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet } from '@/components/ui/sheet'
import {
  DEFAULT_SET_REPS,
  useRoutines,
  type Routine,
  type RoutinesState,
} from '@/features/routines/useRoutines'
import { ExerciseCatalogue } from '@/features/training/ExerciseCatalogue'
import { ExerciseFigure } from '@/features/training/ExerciseFigure'
import type { ExerciseRef } from '@/features/training/useWorkout'
import { todayKey } from '@/lib/date'
import { parseDecimalInput, weekdayLabel } from '@/lib/format'

const REPS_LIMITS = { min: 1, max: 1000, decimals: 0 } as const

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7]

type Step = 'plan' | 'exercises'

/** One exercise of the draft. `key` is React's, not the database's. */
interface DraftExercise {
  key: string
  exerciseId: string
  exercise: ExerciseRef
  setReps: number[]
}

interface Draft {
  name: string
  weekdays: number[]
  exercises: DraftExercise[]
}

const draftOf = (routine: Routine): Draft => ({
  name: routine.name,
  weekdays: routine.weekdays,
  exercises: routine.exercises.map((entry) => ({
    key: entry.id,
    exerciseId: entry.exerciseId,
    exercise: entry.exercise,
    setReps: entry.setReps,
  })),
})

/**
 * A routine, in two steps: what it is called and when it is done, then what is
 * in it.
 *
 * One screen asked for a name, a set of weekdays and a list of exercises all at
 * once — three decisions of different sizes in one wall — and it put the days
 * *after* the exercises, so planning a routine meant finishing the longest part
 * before the app would take the shortest. Naming it and saying when comes first,
 * because that is the order anybody thinks in.
 *
 * **Nothing is written until Save.** The old screen saved every field as it was
 * touched, which left nothing for a cancel button to do — so there was no cancel
 * button, only a delete and a way back, which is what you are reduced to
 * offering when arriving on a screen has already changed the data. The exercises
 * go over in one call (`set_routine_exercises`) so a save cannot half-apply.
 *
 * The picker is a sheet rather than the screen it used to be: adding four lifts
 * is four taps in one place instead of four round trips that each threw the
 * draft away.
 */
export default function RoutineEditorPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const routines = useRoutines()
  const routine = routines.routines.find((entry) => entry.id === id)

  if (routines.status === 'loading') {
    return <p className="font-mono text-2xs text-ink-faint">{t('common.loading')}</p>
  }
  if (!routine) {
    return (
      <p role="alert" className="text-sm text-danger">
        {t('pages.routines.loadFailed')}
      </p>
    )
  }

  // Keyed on the routine, so the draft below is simply its initial state — no
  // effect copying one into the other, and no window where the screen is
  // holding a draft of something else.
  return (
    <Editor
      key={routine.id}
      routine={routine}
      // Arrived from the `+`, so the row carries a stand-in name and there is
      // nothing worth keeping if this is cancelled.
      isNew={params.get('new') === '1'}
      routines={routines}
    />
  )
}

function Editor({
  routine,
  isNew,
  routines: { rename, remove, setWeekdays, saveExercises },
}: {
  routine: Routine
  isNew: boolean
  routines: RoutinesState
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const navigate = useNavigate()
  const id = routine.id

  const [step, setStep] = useState<Step>('plan')
  // A new routine arrives carrying a stand-in name so the list has something
  // to show. The field starts empty rather than holding it for you to clear.
  const [draft, setDraft] = useState<Draft>(() =>
    isNew ? { ...draftOf(routine), name: '' } : draftOf(routine),
  )
  const [picking, setPicking] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const edit = (change: Partial<Draft>) => setDraft({ ...draft, ...change })

  async function cancel() {
    // A routine made by the `+` and then cancelled never existed as far as the
    // list is concerned; one that was already there is left alone.
    if (isNew) await remove(id)
    navigate('/training')
  }

  async function save() {
    setPending(true)
    setError(null)

    const name = draft.name.trim()
    const ok =
      (name === routine.name || (await rename(id, name))) &&
      (draft.weekdays.join() === routine.weekdays.join() ||
        (await setWeekdays(id, draft.weekdays))) &&
      (await saveExercises(id, draft.exercises))

    setPending(false)
    if (!ok) {
      setError(t('pages.routines.editor.saveFailed'))
      return
    }
    navigate('/training')
  }

  const named = draft.name.trim() !== ''

  return (
    <>
      <PageHeader title={named ? draft.name : t('pages.routines.editor.unnamed')} />

      <SegmentedControl
        label={t('pages.routines.editor.steps')}
        value={step}
        onChange={setStep}
        segments={[
          { value: 'plan', label: t('pages.routines.editor.stepPlan') },
          { value: 'exercises', label: t('pages.routines.editor.stepExercises') },
        ]}
      />

      {step === 'plan' ? (
        <section className="mt-6">
          <Panel className="flex flex-col gap-5 p-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="routine-name">{t('pages.routines.editor.name')}</Label>
              <Input
                id="routine-name"
                value={draft.name}
                onChange={(event) => edit({ name: event.target.value })}
                placeholder={t('pages.routines.editor.namePlaceholder')}
                autoFocus={isNew}
              />
            </div>

            <div className="flex flex-col items-start gap-2">
              <p className="font-mono text-2xs text-ink-faint">
                {t('pages.routines.editor.weekdays')}
                <span className="text-ink-faint">{t('pages.routines.editor.weekdaysHint')}</span>
              </p>
              {/* Seven segments in one row, not chips that wrap to six and a
                  stray. A weekday strip that breaks its line has to be read
                  twice, and the seventh day looks like a different kind of
                  thing. Flush children with a divider, the segmented control's
                  shape (§10.7) — several can be on at once, which is the only
                  way it differs. */}
              <div
                role="group"
                aria-label={t('pages.routines.editor.weekdays')}
                // Pulled 8px wider than the panel's padding: seven segments
                // plus their dividers left the last one 43px, and §5.2's floor
                // is 44.
                className="-mx-2 flex w-[calc(100%+1rem)] divide-x divide-line overflow-hidden
                           rounded-md border border-line"
              >
                {WEEKDAYS.map((day) => {
                  const on = draft.weekdays.includes(day)
                  return (
                    <button
                      key={day}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        edit({
                          weekdays: on
                            ? draft.weekdays.filter((d) => d !== day)
                            : [...draft.weekdays, day].sort((a, b) => a - b),
                        })
                      }
                      className={`min-h-11 flex-1 font-mono text-2xs transition-colors
                                  [transition-duration:140ms] active:[transition-duration:0ms]
                                  ${
                                    on
                                      ? 'bg-accent-soft font-medium text-accent'
                                      : 'text-ink-faint active:bg-surface-2'
                                  }`}
                    >
                      {weekdayLabel(day, locale)}
                    </button>
                  )
                })}
              </div>
            </div>
          </Panel>

          <Actions>
            <Button variant="quiet" onClick={() => void cancel()}>
              {t('pages.routines.editor.cancel')}
            </Button>
            <Button variant="primary" disabled={!named} onClick={() => setStep('exercises')}>
              {t('pages.routines.editor.next')} →
            </Button>
          </Actions>
        </section>
      ) : (
        <section className="mt-6">
          <SectionHead
            label={t('pages.routines.editor.exercises')}
            hint={String(draft.exercises.length)}
          />

          {draft.exercises.length === 0 ? (
            <EmptyState>{t('pages.routines.editor.empty')}</EmptyState>
          ) : (
            <ul className="flex flex-col gap-3">
              {draft.exercises.map((entry, index) => (
                <PlannedExercise
                  key={entry.key}
                  entry={entry}
                  locale={locale}
                  first={index === 0}
                  last={index === draft.exercises.length - 1}
                  onUpdate={(setReps) =>
                    edit({
                      exercises: draft.exercises.map((other) =>
                        other.key === entry.key ? { ...other, setReps } : other,
                      ),
                    })
                  }
                  onMove={(by) => {
                    const next = [...draft.exercises]
                    const [moved] = next.splice(index, 1)
                    next.splice(index + by, 0, moved)
                    edit({ exercises: next })
                  }}
                  onRemove={() =>
                    edit({ exercises: draft.exercises.filter((other) => other.key !== entry.key) })
                  }
                />
              ))}
            </ul>
          )}

          <Button
            variant="tinted"
            className="mt-4 w-full md:w-auto"
            onClick={() => setPicking(true)}
          >
            <Plus size={15} strokeWidth={1.75} aria-hidden />
            {t('pages.routines.editor.addExercise')}
          </Button>

          {error ? (
            <p role="alert" className="mt-4 text-sm text-danger">
              {error}
            </p>
          ) : null}

          <Actions>
            <Button variant="quiet" onClick={() => setStep('plan')}>
              ← {t('pages.routines.editor.back')}
            </Button>
            <Button
              variant="primary"
              pending={pending}
              // A routine with nothing in it is a name, and the week refuses to
              // plan one (`plannable`). Saying so here beats letting it save
              // and then quietly ignoring it.
              disabled={draft.exercises.length === 0}
              onClick={() => void save()}
            >
              {pending ? t('pages.routines.editor.saving') : t('pages.routines.editor.save')}
            </Button>
          </Actions>

          {draft.exercises.length === 0 ? (
            <p className="mt-3 text-right font-mono text-2xs text-ink-faint">
              {t('pages.routines.editor.needsExercise')}
            </p>
          ) : null}

          <Sheet
            open={picking}
            onOpenChange={setPicking}
            title={t('pages.routines.editor.pickTitle')}
            closeLabel={t('common.close')}
          >
            {/* The sheet stays open after a pick: adding four lifts is four
                taps in one place, not four round trips through a screen that
                threw the draft away each time. */}
            <ExerciseCatalogue
              date={todayKey()}
              onPick={(exercise) =>
                edit({
                  exercises: [
                    ...draft.exercises,
                    {
                      key: crypto.randomUUID(),
                      exerciseId: exercise.id,
                      exercise: {
                        id: exercise.id,
                        nameEn: exercise.nameEn,
                        nameDe: exercise.nameDe,
                        muscleGroup: exercise.muscleGroup,
                        equipment: exercise.equipment,
                        primaryMuscles: exercise.primaryMuscles,
                        secondaryMuscles: exercise.secondaryMuscles,
                      },
                      setReps: DEFAULT_SET_REPS,
                    },
                  ],
                })
              }
            />
          </Sheet>
        </section>
      )}
    </>
  )
}

/** The pair at the foot of a step: the way out on the left, the way on on the right. */
function Actions({ children }: { children: ReactNode }) {
  return <div className="mt-8 flex items-center justify-between gap-3">{children}</div>
}

function PlannedExercise({
  entry,
  locale,
  first,
  last,
  onUpdate,
  onMove,
  onRemove,
}: {
  entry: DraftExercise
  locale: string
  first: boolean
  last: boolean
  onUpdate: (setReps: number[]) => void
  onMove: (by: -1 | 1) => void
  onRemove: () => void
}) {
  const { t } = useTranslation()
  // One field per set, because a routine that can only say `3 × 8` cannot say
  // 12/10/8 — which is what most people actually write down.
  const [reps, setReps] = useState(entry.setReps.map(String))

  function commit(next: string[]) {
    setReps(next)
    const parsed = next.map((value) => parseDecimalInput(value, REPS_LIMITS))
    if (parsed.some((value) => value === null) || parsed.length === 0) return
    const numbers = parsed as number[]
    if (numbers.join() === entry.setReps.join()) return
    onUpdate(numbers)
  }

  return (
    <li>
      <Panel className="p-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="min-w-0 flex-1 truncate text-sm text-ink">
            {locale === 'de' ? entry.exercise.nameDe : entry.exercise.nameEn}
          </p>
          {/* Beside the name rather than above the sets: it says what this lift
              is for, which is a thing you check while assembling a routine and
              never while typing reps into one. */}
          <ExerciseFigure
            exercise={entry.exercise}
            label={locale === 'de' ? entry.exercise.nameDe : entry.exercise.nameEn}
            className="h-24 shrink-0"
          />
          {/* Up and down rather than a drag handle: a drag on a phone fights
              the scroll it lives inside. */}
          <span className="flex shrink-0 gap-1">
            <Button
              variant="bare"
              size="icon"
              aria-label={t('pages.routines.editor.up')}
              disabled={first}
              onClick={() => onMove(-1)}
            >
              <ChevronUp />
            </Button>
            <Button
              variant="bare"
              size="icon"
              aria-label={t('pages.routines.editor.down')}
              disabled={last}
              onClick={() => onMove(1)}
            >
              <ChevronDown />
            </Button>
          </span>
        </div>

        <ul className="mt-3 flex flex-col gap-2">
          {reps.map((value, index) => (
            <li key={index} className="flex items-center gap-2">
              <span className="w-12 shrink-0 font-mono text-2xs text-ink-faint">
                {t('pages.routines.editor.setN', { n: index + 1 })}
              </span>
              <input
                aria-label={t('pages.routines.editor.setN', { n: index + 1 })}
                inputMode="numeric"
                value={value}
                onChange={(event) =>
                  setReps(reps.map((r, i) => (i === index ? event.target.value : r)))
                }
                onBlur={() => commit(reps)}
                className="min-h-11 min-w-0 flex-1 rounded-md bg-surface-2 px-2 text-right font-mono
                           text-input tabular-nums text-ink md:min-h-9 md:text-sm"
              />
              <span className="w-7 shrink-0 font-mono text-2xs text-ink-faint">
                {t('pages.routines.editor.reps')}
              </span>
              <Button
                variant="bare"
                size="icon"
                aria-label={t('pages.routines.editor.removeSet', { n: index + 1 })}
                disabled={reps.length <= 1}
                onClick={() => commit(reps.filter((_, i) => i !== index))}
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex items-center justify-between gap-3">
          <Button
            variant="bare"
            size="small"
            onClick={() => commit([...reps, reps[reps.length - 1] ?? '8'])}
          >
            <Plus size={15} strokeWidth={1.75} aria-hidden />
            {t('pages.routines.editor.addSet')}
          </Button>
          <Button variant="bare" size="small" className="text-danger" onClick={onRemove}>
            {t('pages.routines.editor.remove')}
          </Button>
        </div>
      </Panel>
    </li>
  )
}

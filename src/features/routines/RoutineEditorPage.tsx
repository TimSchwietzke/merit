import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react'
import { toast } from 'sonner'

import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Panel } from '@/components/Panel'
import { SectionHead } from '@/components/SectionHead'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRoutines, type RoutineExercise } from '@/features/routines/useRoutines'
import { parseDecimalInput, weekdayLabel } from '@/lib/format'

const REPS_LIMITS = { min: 1, max: 1000, decimals: 0 } as const

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7]

/**
 * What a routine contains: its name, the weekdays it is planned for, and its
 * exercises in order with the sets and reps each plans for.
 *
 * Everything saves on change rather than behind a button. A screen with one
 * save button and eight fields is a screen that loses work when somebody backs
 * out of it, and every field here is a single value with an obvious meaning.
 */
export default function RoutineEditorPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const { id } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const navigate = useNavigate()

  // Arrived from the `+`, so the routine is carrying a stand-in name and
  // naming it is the first thing to do. The field starts empty rather than
  // holding that stand-in for you to clear — iOS will not always open the
  // keyboard for a focus it did not see you ask for, and a selection that is
  // lost to the tap which fixes that leaves you deleting `Neue Routine` by
  // hand. Blank with its placeholder showing costs nothing if the focus lands
  // and nothing if it does not, and the row keeps the stand-in until something
  // is typed over it.
  //
  // A callback ref rather than `autoFocus`: the field mounts only once the
  // routine has loaded, which is long after the attribute would have had its
  // say.
  const isNew = params.get('new') === '1'
  const nameField = useCallback(
    (node: HTMLInputElement | null) => {
      if (node && isNew) node.focus()
    },
    [isNew],
  )

  const { routines, status, rename, remove, setWeekdays, updateExercise, removeExercise, moveExercise } =
    useRoutines()
  const routine = routines.find((entry) => entry.id === id)

  const [failed, setFailed] = useState(false)
  const fail = (ok: boolean) => setFailed(!ok)


  if (status === 'loading') {
    return <p className="font-mono text-2xs text-ink-faint">{t('common.loading')}</p>
  }
  if (!routine || !id) {
    return (
      <p role="alert" className="text-sm text-danger">
        {t('pages.routines.loadFailed')}
      </p>
    )
  }

  const empty = routine.exercises.length === 0

  return (
    <>
      <PageHeader title={routine.name} />

      <section>
        <Panel className="flex flex-col gap-5 p-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="routine-name">{t('pages.routines.editor.name')}</Label>
            <Input
              id="routine-name"
              ref={nameField}
              defaultValue={isNew ? '' : routine.name}
              placeholder={t('pages.routines.editor.namePlaceholder')}
              // On blur, not on keystroke: a rename is one decision, and saving
              // per character writes eight rows for one change (§10.5).
              onBlur={(event) => {
                const next = event.target.value.trim()
                if (next && next !== routine.name) void rename(id, next).then(fail)
              }}
            />
          </div>

          <div className="flex flex-col items-start gap-2">
            <p className="font-mono text-2xs text-ink-faint">
              {t('pages.routines.editor.weekdays')}
              <span className="text-ink-faint">
                {empty
                  ? t('pages.routines.editor.weekdaysLocked')
                  : t('pages.routines.editor.weekdaysHint')}
              </span>
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
              // Pulled 8px wider than the panel's padding: seven segments plus
              // their dividers left the last one 43px, and §5.2's floor is 44.
              className="-mx-2 flex w-[calc(100%+1rem)] divide-x divide-line overflow-hidden
                         rounded-md border border-line"
            >
              {WEEKDAYS.map((day) => {
                const on = routine.weekdays.includes(day)
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={on}
                    // An empty routine is never planned into a week
                    // (`plannable`), so offering the days would be a promise
                    // the week screen does not keep.
                    disabled={empty}
                    onClick={() =>
                      void setWeekdays(
                        id,
                        on ? routine.weekdays.filter((d) => d !== day) : [...routine.weekdays, day],
                      ).then(fail)
                    }
                    className={`min-h-11 flex-1 font-mono text-2xs transition-colors
                                [transition-duration:140ms] active:[transition-duration:0ms]
                                disabled:opacity-35
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
      </section>

      <section className="mt-8">
        <SectionHead
          label={t('pages.routines.editor.exercises')}
          hint={String(routine.exercises.length)}
        />

        {routine.exercises.length === 0 ? (
          <EmptyState>{t('pages.routines.editor.empty')}</EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {routine.exercises.map((entry, index) => (
              <PlannedExercise
                key={entry.id}
                entry={entry}
                locale={locale}
                first={index === 0}
                last={index === routine.exercises.length - 1}
                onUpdate={(setReps) => void updateExercise(entry.id, setReps).then(fail)}
                onMove={(by) => void moveExercise(id, entry.id, by).then(fail)}
                onRemove={() => void removeExercise(entry.id).then(fail)}
              />
            ))}
          </ul>
        )}

        {failed ? (
          <p role="alert" className="mt-3 text-sm text-danger">
            {t('pages.routines.editor.saveFailed')}
          </p>
        ) : null}

        <Button asChild variant="tinted" className="mt-4 w-full md:w-auto">
          <Link to={`/training/add?routine=${id}`}>{t('pages.routines.editor.addExercise')}</Link>
        </Button>
      </section>

      <section className="mt-8">
        <Button
          variant="quiet"
          className="text-danger hover:border-danger"
          onClick={async () => {
            if (!(await remove(id))) {
              setFailed(true)
              return
            }
            toast(t('pages.routines.editor.deleted', { name: routine.name }))
            navigate('/training')
          }}
        >
          {t('pages.routines.editor.deleteRoutine')}
        </Button>
      </section>

      <Link
        to="/training"
        className="mt-8 inline-flex min-h-11 items-center font-mono text-2xs text-accent underline decoration-1 underline-offset-2"
      >
        ← {t('pages.routines.back')}
      </Link>
    </>
  )
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
  entry: RoutineExercise
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

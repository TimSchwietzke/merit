import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronUp } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useActiveSession } from '@/features/training/useActiveSession'
import { formatNumber, parseDecimalInput } from '@/lib/format'
import { groupSets, performed } from '@/lib/training'

const REPS = { min: 1, max: 1000, decimals: 0 } as const
const WEIGHT = { min: 0, max: 1000, decimals: 2 } as const
const RIR = { min: 0, max: 10, decimals: 0 } as const

const FIELD = `min-h-11 min-w-0 rounded-md bg-surface-2 px-2 text-right font-mono text-input
               tabular-nums text-ink placeholder:text-ink-faint md:min-h-9 md:text-sm`

/**
 * The set you are on, wherever you are in the app.
 *
 * A dialog per set is fifteen dismissals in a five-exercise session, each one
 * needing the hand that is holding a bar. This asks for nothing, stays put, and
 * survives walking off to the food tab to check a number — which is the whole
 * reason it is a bar and not a dialog.
 *
 * The figures are **placeholders**, not values. They hold what the plan expects
 * or what was done last time, so an unlogged set visibly is an expectation:
 * logging accepts it, typing overrides it, and a lift with no history shows
 * nothing rather than a number somebody made up.
 */
export function SessionBar() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const { sets, exercises, active, running, log, end } = useActiveSession()
  const [open, setOpen] = useState(false)

  if (!running || !active) return null

  const exercise = exercises.get(active.exerciseId)
  const name = exercise ? (locale === 'de' ? exercise.nameDe : exercise.nameEn) : ''
  const mine = sets.filter((set) => set.exerciseId === active.exerciseId)
  const doneHere = performed(mine)

  return (
    <div
      data-session-bar
      className="fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-30 border-t
                 border-line bg-surface lg:bottom-0"
    >
      <div className="mx-auto w-full max-w-[860px] px-4 py-2 md:px-6">
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate font-mono text-2xs text-ink-faint">
            <span className="text-ink">{name}</span> ·{' '}
            {t('pages.training.bar.setOf', { n: doneHere.length + 1, total: mine.length })}
          </p>
          <Button
            variant="bare"
            size="icon"
            aria-label={t(open ? 'pages.training.bar.collapse' : 'pages.training.bar.expand')}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <ChevronDown /> : <ChevronUp />}
          </Button>
        </div>

        {/* Keyed on the set, so the next one arrives with empty fields rather
            than an effect clearing the last one's. */}
        <SetEntry
          key={active.id}
          expected={{
            reps: String(active.reps),
            weight:
              active.weightKg > 0
                ? formatNumber(active.weightKg, locale, active.weightKg % 1 === 0 ? 0 : 1)
                : '',
          }}
          labels={{
            reps: t('pages.training.set.reps'),
            weight: t('pages.training.set.weight'),
            rir: t('pages.training.set.rir'),
            log: t('pages.training.bar.log'),
            logging: t('pages.training.bar.logging'),
            invalid: t('pages.training.bar.invalid'),
          }}
          onLog={log}
        />

        {open ? (
          <div className="mt-3 border-t border-line pt-3">
            <p className="font-mono text-2xs text-ink-faint">
              {doneHere.length > 0 ? (
                <span className="text-ink">
                  {groupSets(doneHere)
                    .map((g) => `${g.sets} × ${g.reps} @ ${formatNumber(g.weightKg, locale, 0)} kg`)
                    .join(' · ')}
                </span>
              ) : (
                t('pages.training.never')
              )}
            </p>
            <Button variant="quiet" size="small" className="mt-3" onClick={end}>
              {t('pages.training.bar.finish')}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

/**
 * Three fields and a button. Empty is meaningful: an untouched field means "as
 * the placeholder says", which is how a set done exactly as planned is logged
 * with one tap and no typing.
 */
function SetEntry({
  expected,
  labels,
  onLog,
}: {
  expected: { reps: string; weight: string }
  labels: Record<'reps' | 'weight' | 'rir' | 'log' | 'logging' | 'invalid', string>
  onLog: (values: { reps: number; weightKg: number; rir: number | null }) => Promise<boolean>
}) {
  const [reps, setReps] = useState('')
  const [weight, setWeight] = useState('')
  const [rir, setRir] = useState('')
  const [invalid, setInvalid] = useState(false)
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsedReps = parseDecimalInput(reps.trim() === '' ? expected.reps : reps, REPS)
    const parsedWeight = parseDecimalInput(weight.trim() === '' ? expected.weight : weight, WEIGHT)
    const parsedRir = rir.trim() === '' ? null : parseDecimalInput(rir, RIR)

    if (parsedReps === null || parsedWeight === null || (rir.trim() !== '' && parsedRir === null)) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    setPending(true)
    await onLog({ reps: parsedReps, weightKg: parsedWeight, rir: parsedRir })
    setPending(false)
  }

  return (
    <>
      <form onSubmit={submit} className="mt-1 flex items-center gap-2" noValidate>
        <input
          aria-label={labels.reps}
          inputMode="numeric"
          value={reps}
          placeholder={expected.reps}
          onChange={(event) => setReps(event.target.value)}
          className={`${FIELD} flex-1`}
        />
        <input
          aria-label={labels.weight}
          inputMode="decimal"
          value={weight}
          placeholder={expected.weight}
          onChange={(event) => setWeight(event.target.value)}
          className={`${FIELD} flex-1`}
        />
        <input
          aria-label={labels.rir}
          inputMode="numeric"
          value={rir}
          onChange={(event) => setRir(event.target.value)}
          className={`${FIELD} w-14 shrink-0`}
        />
        <Button type="submit" variant="primary" size="small" pending={pending} className="shrink-0">
          {pending ? labels.logging : labels.log}
        </Button>
      </form>

      {invalid ? (
        <p role="alert" className="mt-1 text-sm text-danger">
          {labels.invalid}
        </p>
      ) : null}
    </>
  )
}

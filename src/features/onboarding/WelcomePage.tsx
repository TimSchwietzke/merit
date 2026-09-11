import { useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { Choice } from '@/components/Choice'
import { NumberField } from '@/components/NumberField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useOnboarding, type OnboardingState } from '@/features/onboarding/useOnboarding'
import { WelcomeIntro } from '@/features/onboarding/WelcomeIntro'
import { todayKey } from '@/lib/date'
import { formatForInput, formatNumber, parseDecimalInput } from '@/lib/format'
import {
  ACTIVITY_LEVELS,
  calculateEnergy,
  calculateMacros,
  DIRECTIONS,
  DIRECTION_SHIFT,
  MACRO_DEFAULTS,
  missingInputs,
  type ActivityLevel,
  type Direction,
  type Sex,
} from '@/lib/goals'
import { resumeAt, STEPS, type Answers, type Step } from '@/lib/onboarding'
import { WEIGHT_LIMITS } from '@/lib/weight'

const HEIGHT_LIMITS = { min: 100, max: 250, decimals: 1 } as const

/** What to call each figure the calculation is still waiting on. */
const MISSING_LABEL = {
  weightKg: 'nav.weight',
  heightCm: 'pages.goals.body.height',
  birthDate: 'pages.goals.body.birthDate',
  sex: 'pages.goals.body.sex',
  activityLevel: 'pages.goals.body.activity',
  direction: 'pages.goals.body.direction',
} as const

/**
 * The first run (GOAL.md §2.1.1).
 *
 * Four panels saying what the app is, then five questions, then the dashboard
 * with something on it. Every question is one the app already asks somewhere
 * else; this is a path through them, not a second place to keep them, and each
 * answer is written as its screen is left so that quitting halfway loses
 * nothing and asks for the rest next time.
 *
 * Nothing here is compulsory. A step left empty is simply asked again on the
 * next start, and `later` ends the walkthrough for good.
 */
export default function WelcomePage() {
  const { t } = useTranslation()
  const state = useOnboarding()

  if (state.status === 'loading') return null

  if (state.status === 'error') {
    return (
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-[400px] flex-col justify-center px-4">
        <p role="alert" className="text-sm text-danger">
          {t('pages.welcome.loadFailed')}
        </p>
      </main>
    )
  }

  // Mounted once, when the answers are in: the starting step is read from them
  // and must not be recomputed as they are filled in.
  return <Walkthrough state={state} />
}

function Walkthrough({ state }: { state: OnboardingState }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { answers, onboarded, finish } = state

  const [place, setPlace] = useState(() => resumeAt(answers, onboarded))
  const [leaving, setLeaving] = useState(false)
  const [failed, setFailed] = useState(false)

  /** Stop asking, and go where the answers now have something to say. */
  async function leave() {
    setFailed(false)
    setLeaving(true)
    const done = await finish()
    setLeaving(false)
    if (!done) return setFailed(true)
    navigate('/', { replace: true })
  }

  if (place.intro) {
    return <WelcomeIntro onDone={() => setPlace({ intro: false, step: place.step })} />
  }

  const index = STEPS.indexOf(place.step)
  const go = (step: Step) => setPlace({ intro: false, step })
  const next = () => {
    const following = STEPS[index + 1]
    if (following) go(following)
    else void leave()
  }

  const shared = { index, answers, state, onDone: next, onLater: leave, leaving }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[400px] flex-col px-4 pt-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <header className="flex min-h-11 items-center justify-between">
        {index > 0 ? (
          <button
            type="button"
            onClick={() => go(STEPS[index - 1])}
            className="-ml-3 min-h-11 px-3 font-mono text-2xs text-ink-faint hover:text-ink"
          >
            {t('pages.welcome.back')}
          </button>
        ) : (
          <span />
        )}
        <p className="font-mono text-2xs text-ink-faint tabular-nums">
          {index + 1} / {STEPS.length}
        </p>
      </header>

      {/* Keyed on the step, so each screen arrives from the side the walkthrough
          is travelling: the same 260ms move a row of days makes (§13). */}
      <div key={place.step} className="merit-left flex flex-1 flex-col">
        {place.step === 'name' ? <NameStep {...shared} /> : null}
        {place.step === 'body' ? <BodyStep {...shared} /> : null}
        {place.step === 'about' ? <AboutStep {...shared} /> : null}
        {place.step === 'goal' ? <GoalStep {...shared} /> : null}
        {place.step === 'target' ? <TargetStep {...shared} /> : null}
      </div>

      {failed ? (
        <p role="alert" className="mt-4 text-sm text-danger">
          {t('pages.welcome.saveFailed')}
        </p>
      ) : null}
    </main>
  )
}

interface StepProps {
  index: number
  answers: Answers
  state: OnboardingState
  onDone: () => void
  onLater: () => void
  leaving: boolean
}

/**
 * The frame every question shares: the question itself, one line saying why it
 * is being asked, the fields, and the two ways on. The primary action sits at
 * the bottom of the screen, where a thumb is (§7).
 */
function StepShell({
  step,
  onSubmit,
  pending,
  failed,
  onLater,
  leaving,
  cta,
  children,
}: {
  step: Step
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  pending: boolean
  failed: boolean
  onLater: () => void
  leaving: boolean
  cta?: string
  children: ReactNode
}) {
  const { t } = useTranslation()

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-1 flex-col">
      <div className="mt-8 flex flex-col gap-2">
        <h1 className="font-serif text-xl leading-snug tracking-tight text-balance">
          {t(`pages.welcome.steps.${step}.title`)}
        </h1>
        <p className="text-sm leading-[1.6] text-ink-muted">
          {t(`pages.welcome.steps.${step}.lead`)}
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-6">{children}</div>

      {failed ? (
        <p role="alert" className="mt-6 text-sm text-danger">
          {t('pages.welcome.saveFailed')}
        </p>
      ) : null}

      {/* Pushed to the bottom of the screen rather than left under the last
          field: the primary action belongs where a thumb is (§7), and anchored
          it stays in one place as the steps change height. */}
      <div className="mt-auto flex flex-col gap-3 pt-10">
        <Button type="submit" variant="primary" className="w-full" pending={pending || leaving}>
          {cta ?? t('pages.welcome.next')}
        </Button>
        <button
          type="button"
          onClick={onLater}
          disabled={pending || leaving}
          className="min-h-11 text-center font-mono text-2xs text-ink-faint hover:text-ink disabled:opacity-35"
        >
          {t('pages.welcome.later')}
        </button>
      </div>
    </form>
  )
}

/** Runs a save and moves on only if it worked. */
function useSaving(onDone: () => void) {
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  const run = async (save: () => Promise<boolean>) => {
    setFailed(false)
    setPending(true)
    const saved = await save()
    setPending(false)
    if (saved) onDone()
    else setFailed(true)
  }

  return { pending, failed, run }
}

function NameStep({ answers, state, onDone, onLater, leaving }: StepProps) {
  const { t } = useTranslation()
  const [name, setName] = useState(answers.displayName ?? '')
  const { pending, failed, run } = useSaving(onDone)

  return (
    <StepShell
      step="name"
      pending={pending}
      failed={failed}
      onLater={onLater}
      leaving={leaving}
      onSubmit={(event) => {
        event.preventDefault()
        const trimmed = name.trim()
        // Empty clears rather than writing "", so the column keeps meaning
        // "not set" one way only.
        void run(() => state.saveProfile({ displayName: trimmed === '' ? null : trimmed }))
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="welcome-name">{t('pages.account.profile.name.label')}</Label>
        <Input
          id="welcome-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="name"
          autoFocus
          maxLength={60}
        />
      </div>
    </StepShell>
  )
}

function BodyStep({ answers, state, onDone, onLater, leaving }: StepProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const [weight, setWeight] = useState(
    answers.weightKg === null ? '' : formatForInput(answers.weightKg, locale, WEIGHT_LIMITS.decimals),
  )
  const [height, setHeight] = useState(
    answers.heightCm === null ? '' : formatForInput(answers.heightCm, locale, HEIGHT_LIMITS.decimals),
  )
  const [errors, setErrors] = useState<{ weight?: string; height?: string }>({})
  const { pending, failed, run } = useSaving(onDone)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const weightKg = weight.trim() === '' ? null : parseDecimalInput(weight, WEIGHT_LIMITS)
    const heightCm = height.trim() === '' ? null : parseDecimalInput(height, HEIGHT_LIMITS)

    const next = {
      ...(weight.trim() !== '' && weightKg === null
        ? { weight: t('pages.welcome.steps.body.weightInvalid') }
        : {}),
      ...(height.trim() !== '' && heightCm === null
        ? { height: t('pages.goals.body.heightInvalid') }
        : {}),
    }
    setErrors(next)
    if (Object.keys(next).length > 0) return

    void run(async () => {
      // The weight is a weigh-in, the height is a profile field: two tables,
      // and the step is only done when both have taken it.
      const savedHeight = await state.saveProfile({ heightCm })
      if (weightKg === null) return savedHeight
      return (await state.saveWeight(weightKg)) && savedHeight
    })
  }

  return (
    <StepShell
      step="body"
      pending={pending}
      failed={failed}
      onLater={onLater}
      leaving={leaving}
      onSubmit={submit}
    >
      <NumberField
        id="welcome-weight"
        label={t('nav.weight')}
        unit="kg"
        value={weight}
        onChange={(event) => setWeight(event.target.value)}
        placeholder="82,4"
        error={errors.weight}
        autoFocus
      />
      <NumberField
        id="welcome-height"
        label={t('pages.goals.body.height')}
        unit="cm"
        value={height}
        onChange={(event) => setHeight(event.target.value)}
        placeholder="181"
        error={errors.height}
      />
    </StepShell>
  )
}

function AboutStep({ answers, state, onDone, onLater, leaving }: StepProps) {
  const { t } = useTranslation()
  const [birthDate, setBirthDate] = useState(answers.birthDate ?? '')
  const [sex, setSex] = useState<Sex | null>(answers.sex)
  const { pending, failed, run } = useSaving(onDone)

  return (
    <StepShell
      step="about"
      pending={pending}
      failed={failed}
      onLater={onLater}
      leaving={leaving}
      onSubmit={(event) => {
        event.preventDefault()
        void run(() => state.saveProfile({ birthDate: birthDate || null, sex }))
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="welcome-birth">{t('pages.goals.body.birthDate')}</Label>
        <Input
          id="welcome-birth"
          type="date"
          value={birthDate}
          max={todayKey()}
          onChange={(event) => setBirthDate(event.target.value)}
          className="font-mono [&::-webkit-calendar-picker-indicator]:opacity-60 dark:[&::-webkit-calendar-picker-indicator]:invert"
        />
      </div>

      <Choice
        label={t('pages.goals.body.sex')}
        value={sex}
        onChange={setSex}
        options={(['female', 'male'] as const).map((value) => ({
          value,
          label: t(`pages.goals.body.sexes.${value}`),
        }))}
      />
    </StepShell>
  )
}

function GoalStep({ answers, state, onDone, onLater, leaving }: StepProps) {
  const { t } = useTranslation()
  const [activity, setActivity] = useState<ActivityLevel | null>(answers.activityLevel)
  const [direction, setDirection] = useState<Direction | null>(answers.direction)
  const { pending, failed, run } = useSaving(onDone)

  return (
    <StepShell
      step="goal"
      pending={pending}
      failed={failed}
      onLater={onLater}
      leaving={leaving}
      onSubmit={(event) => {
        event.preventDefault()
        void run(() => state.saveProfile({ activityLevel: activity, direction }))
      }}
    >
      {/* Five options, so a select rather than a segmented control: at 375px
          five segments give 60px each (§10.7). */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="welcome-activity">{t('pages.goals.body.activity')}</Label>
        <select
          id="welcome-activity"
          value={activity ?? ''}
          onChange={(event) => setActivity((event.target.value || null) as ActivityLevel | null)}
          className="min-h-11 rounded-md border border-line bg-surface px-3.5 py-3 text-input text-ink md:min-h-9 md:py-2 md:text-sm"
        >
          <option value="" />
          {ACTIVITY_LEVELS.map((value) => (
            <option key={value} value={value}>
              {t(`pages.goals.body.activities.${value}`)}
            </option>
          ))}
        </select>
      </div>

      <Choice
        label={t('pages.goals.body.direction')}
        value={direction}
        onChange={setDirection}
        options={DIRECTIONS.map((value) => ({
          value,
          label: t(`pages.goals.body.directions.${value}`),
        }))}
      />
    </StepShell>
  )
}

/**
 * The last screen: what the figures just entered add up to.
 *
 * The energy is arithmetic and it shows its working, the same as the targets
 * screen. The macros are the split that screen offers as a starting point, at
 * its own defaults, applied here by pressing the button rather than written in
 * by the app on its own. Merit does not decide what anybody should eat
 * (CLAUDE.md hard rule 5): it does the division and says where to change it.
 *
 * With a figure missing there is nothing to calculate, so the screen says which
 * one and finishes without a target rather than inventing one.
 */
function TargetStep({ answers, state, onDone, onLater, leaving }: StepProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const { pending, failed, run } = useSaving(onDone)

  const inputs = {
    weightKg: answers.weightKg ?? undefined,
    heightCm: answers.heightCm ?? undefined,
    birthDate: answers.birthDate ?? undefined,
    sex: answers.sex ?? undefined,
    activityLevel: answers.activityLevel ?? undefined,
    direction: answers.direction ?? undefined,
  }
  const missing = missingInputs(inputs)

  const energy =
    missing.length === 0
      ? calculateEnergy(
          {
            weightKg: answers.weightKg as number,
            heightCm: answers.heightCm as number,
            birthDate: answers.birthDate as string,
            sex: answers.sex as Sex,
            activityLevel: answers.activityLevel as ActivityLevel,
            direction: answers.direction as Direction,
          },
          todayKey(),
        )
      : null

  const macros =
    energy === null
      ? null
      : calculateMacros({
          kcal: energy.target,
          weightKg: answers.weightKg as number,
          proteinPerKg: MACRO_DEFAULTS.proteinPerKg,
          fatShare: MACRO_DEFAULTS.fatShare,
        })

  // Signed distance from maintenance: −15%, not "85% of it". Formatted data
  // rather than a phrase, so it needs no translation of its own.
  const percent = new Intl.NumberFormat(locale, { style: 'percent', signDisplay: 'exceptZero' })
  const grams = (value: number) => `${formatNumber(value, locale, 0)} g`

  return (
    <StepShell
      step="target"
      pending={pending}
      failed={failed}
      onLater={onLater}
      leaving={leaving}
      cta={t(energy === null ? 'pages.welcome.finish' : 'pages.welcome.steps.target.save')}
      onSubmit={(event) => {
        event.preventDefault()
        if (energy === null || macros === null) return onDone()
        void run(() => state.saveTarget({ kcal: energy.target, ...macros }))
      }}
    >
      {energy === null || macros === null ? (
        <p className="text-sm text-ink-muted">
          {t('pages.goals.targets.needs', {
            fields: [...new Set(missing.map((field) => t(MISSING_LABEL[field])))].join(', '),
          })}
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-1 font-mono text-2xs text-ink-faint">
            <p>
              <span className="text-ink">{formatNumber(energy.resting, locale, 0)}</span> kcal ·{' '}
              {t('pages.goals.targets.resting')}
            </p>
            <p>
              <span className="text-ink">{formatNumber(energy.maintenance, locale, 0)}</span> kcal ·{' '}
              {t('pages.goals.targets.maintenance')}
            </p>
          </div>

          <p className="font-mono text-2xl tabular-nums">
            {formatNumber(energy.target, locale, 0)}
            <span className="ml-2 text-2xs text-ink-faint">
              kcal {percent.format(DIRECTION_SHIFT[answers.direction as Direction])}
            </span>
          </p>

          <dl className="grid grid-cols-3 gap-3 border-t border-line pt-4 font-mono text-2xs text-ink-faint">
            {(
              [
                ['protein', grams(macros.proteinG)],
                ['fat', grams(macros.fatG)],
                ['carbs', grams(macros.carbsG)],
              ] as const
            ).map(([key, value]) => (
              <div key={key}>
                <dt>{t(`pages.goals.targets.${key}`)}</dt>
                <dd className="mt-1 text-sm text-ink tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>

          <p className="font-mono text-2xs text-ink-faint">{t('pages.welcome.steps.target.note')}</p>
        </>
      )}
    </StepShell>
  )
}

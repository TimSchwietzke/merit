import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { NumberField } from '@/components/NumberField'
import { Panel } from '@/components/Panel'
import { ScreenTitle } from '@/components/ScreenTitle'
import { SectionHead } from '@/components/SectionHead'
import { SegmentedControl } from '@/components/SegmentedControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useGoals, type BodyProfile } from '@/features/goals/useGoals'
import { todayKey } from '@/lib/date'
import { formatForInput, formatNumber, parseDecimalInput } from '@/lib/format'
import {
  ACTIVITY_LEVELS,
  calculateEnergy,
  calculateMacros,
  DIRECTIONS,
  MACRO_DEFAULTS,
  DIRECTION_SHIFT,
  goalOn,
  missingInputs,
  type ActivityLevel,
  type Direction,
  type GoalMode,
  type Sex,
  type Targets,
} from '@/lib/goals'

/** What to call each input the calculation is still waiting on. */
const MISSING_LABEL = {
  weightKg: 'nav.weight',
  heightCm: 'pages.goals.body.height',
  birthDate: 'pages.goals.body.birthDate',
  sex: 'pages.goals.body.sex',
  activityLevel: 'pages.goals.body.activity',
  direction: 'pages.goals.body.direction',
} as const

const HEIGHT_LIMITS = { min: 100, max: 250, decimals: 1 } as const
const KCAL_LIMITS = { min: 500, max: 10000, decimals: 0 } as const
const MACRO_LIMITS = { min: 0, max: 1000, decimals: 0 } as const
const PER_KG_LIMITS = { min: 0.5, max: 4, decimals: 2 } as const
const SHARE_LIMITS = { min: 5, max: 70, decimals: 0 } as const

/**
 * What a day is measured against.
 *
 * The calculated mode shows its working — resting, maintenance, then the shift —
 * because the target rests on an equation and a coarse activity multiplier, and
 * a single number with nothing beside it is one the user has to take on trust.
 *
 * Only energy is calculated. GOAL.md §5 asks for the *calorie* goal to be
 * calculable; choosing somebody's protein split for them would be dietary
 * advice, which this app does not give (CLAUDE.md hard rule 5).
 */
export default function GoalsPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const { goals, body, weightKg, status, saveBody, saveTargets } = useGoals()

  if (status === 'loading') {
    return (
      <>
        <ScreenTitle>{t('nav.goals')}</ScreenTitle>
        <p className="font-mono text-2xs text-ink-faint">{t('common.loading')}</p>
      </>
    )
  }

  if (status === 'error') {
    return (
      <>
        <ScreenTitle>{t('nav.goals')}</ScreenTitle>
        <p role="alert" className="text-sm text-danger">
          {t('pages.goals.loadFailed')}
        </p>
      </>
    )
  }

  return (
    <>
      <ScreenTitle>{t('nav.goals')}</ScreenTitle>
      {/* Keyed so each form starts from what was loaded, without syncing state
          in an effect. */}
      <BodySection key={JSON.stringify(body)} body={body} weightKg={weightKg} onSave={saveBody} />
      <TargetsSection
        key={goals.length}
        body={body}
        weightKg={weightKg}
        current={goalOn(goals, todayKey())}
        onSave={saveTargets}
        locale={locale}
      />
    </>
  )
}

function BodySection({
  body,
  weightKg,
  onSave,
}: {
  body: BodyProfile
  weightKg: number | null
  onSave: (body: BodyProfile) => Promise<boolean>
}) {
  const { t, i18n } = useTranslation()
  const [height, setHeight] = useState(
    body.heightCm === null ? '' : formatForInput(body.heightCm, i18n.language, 1),
  )
  const [birthDate, setBirthDate] = useState(body.birthDate ?? '')
  const [sex, setSex] = useState<Sex | null>(body.sex)
  const [activity, setActivity] = useState<ActivityLevel | null>(body.activityLevel)
  const [direction, setDirection] = useState<Direction | null>(body.direction)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const heightCm = height.trim() === '' ? null : parseDecimalInput(height, HEIGHT_LIMITS)
    if (height.trim() !== '' && heightCm === null) {
      setError(t('pages.goals.body.heightInvalid'))
      return
    }
    setError(null)
    setFailed(false)
    setPending(true)
    const saved = await onSave({
      heightCm,
      birthDate: birthDate || null,
      sex,
      activityLevel: activity,
      direction,
    })
    setPending(false)
    if (!saved) setFailed(true)
  }

  return (
    <section>
      <SectionHead label={t('pages.goals.body.label')} />
      <p className="mb-3 max-w-[68ch] text-sm text-ink-muted">{t('pages.goals.body.lead')}</p>

      <form onSubmit={submit} noValidate>
        <Panel className="flex flex-col gap-5 p-4">
          <NumberField
            id="body-height"
            label={t('pages.goals.body.height')}
            unit="cm"
            value={height}
            onChange={(event) => setHeight(event.target.value)}
            placeholder="181"
            error={error ?? undefined}
          />

          <div className="flex flex-col gap-2">
            <Label htmlFor="body-birth">{t('pages.goals.body.birthDate')}</Label>
            <Input
              id="body-birth"
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

          {/* Five options, so a select rather than a segmented control: at
              375px five segments give 60px each (§10.7). */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="body-activity">{t('pages.goals.body.activity')}</Label>
            <select
              id="body-activity"
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

          {/* Weight is not asked for again: it is already logged, and a second
              copy is one the user has to remember to keep in step. */}
          <p className="font-mono text-2xs text-ink-faint">
            {weightKg === null ? (
              t('pages.goals.body.weightMissing')
            ) : (
              <>
                <span className="text-ink">{formatNumber(weightKg, i18n.language)} kg</span>{' '}
                {t('pages.goals.body.weight')}
              </>
            )}
          </p>

          {failed ? (
            <p role="alert" className="text-sm text-danger">
              {t('pages.goals.body.saveFailed')}
            </p>
          ) : null}

          <Button type="submit" variant="quiet" pending={pending}>
            {pending ? t('pages.goals.body.saving') : t('pages.goals.body.save')}
          </Button>
        </Panel>
      </form>
    </section>
  )
}

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T | null
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="flex flex-col items-start gap-2">
      <p className="font-mono text-2xs text-ink-faint">{label}</p>
      <SegmentedControl<T>
        label={label}
        // The control has no empty state, so an unset profile field shows the
        // first option unselected rather than inventing a value: `value` stays
        // outside the option set until the user picks one.
        value={value ?? ('' as T)}
        onChange={onChange}
        segments={options}
      />
    </div>
  )
}

function TargetsSection({
  body,
  weightKg,
  current,
  onSave,
  locale,
}: {
  body: BodyProfile
  weightKg: number | null
  current: ReturnType<typeof goalOn>
  onSave: (mode: GoalMode, targets: Targets) => Promise<boolean>
  locale: string
}) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<GoalMode>(current?.mode ?? 'manual')
  const [kcal, setKcal] = useState(current ? String(current.kcal) : '')
  const [protein, setProtein] = useState(current ? String(current.proteinG) : '')
  const [fat, setFat] = useState(current ? String(current.fatG) : '')
  const [carbs, setCarbs] = useState(current ? String(current.carbsG) : '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  const missing = missingInputs({
    weightKg: weightKg ?? undefined,
    heightCm: body.heightCm ?? undefined,
    birthDate: body.birthDate ?? undefined,
    sex: body.sex ?? undefined,
    activityLevel: body.activityLevel ?? undefined,
    direction: body.direction ?? undefined,
  })

  const computed =
    missing.length === 0
      ? calculateEnergy(
          {
            weightKg: weightKg as number,
            heightCm: body.heightCm as number,
            birthDate: body.birthDate as string,
            sex: body.sex as Sex,
            activityLevel: body.activityLevel as ActivityLevel,
            direction: body.direction as Direction,
          },
          todayKey(),
        )
      : null

  const effectiveKcal =
    mode === 'calculated' ? computed?.target ?? null : parseDecimalInput(kcal, KCAL_LIMITS)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next: Record<string, string> = {}

    if (effectiveKcal === null) next.kcal = t('pages.goals.targets.kcalInvalid')
    const macros = { proteinG: protein, fatG: fat, carbsG: carbs }
    const parsed: Record<string, number | null> = {}
    for (const [key, raw] of Object.entries(macros)) {
      parsed[key] = parseDecimalInput(raw, MACRO_LIMITS)
      if (parsed[key] === null) next[key] = t('pages.goals.targets.macroInvalid')
    }

    setErrors(next)
    if (Object.keys(next).length > 0 || effectiveKcal === null) return

    setFailed(false)
    setPending(true)
    const saved = await onSave(mode, {
      kcal: effectiveKcal,
      proteinG: parsed.proteinG as number,
      fatG: parsed.fatG as number,
      carbsG: parsed.carbsG as number,
    })
    setPending(false)
    if (!saved) setFailed(true)
  }

  // The distance from maintenance, signed: −15%, not "85% of it". Formatted
  // data rather than a phrase, so it needs no translation of its own.
  const percent = new Intl.NumberFormat(locale, { style: 'percent', signDisplay: 'exceptZero' })

  return (
    <section className="mt-8">
      <SectionHead label={t('pages.goals.targets.label')} />

      <form onSubmit={submit} noValidate>
        <Panel className="flex flex-col gap-5 p-4">
          <div className="flex flex-col items-start gap-2">
            <p className="font-mono text-2xs text-ink-faint">{t('pages.goals.targets.mode')}</p>
            <SegmentedControl<GoalMode>
              label={t('pages.goals.targets.mode')}
              value={mode}
              onChange={setMode}
              segments={(['manual', 'calculated'] as const).map((value) => ({
                value,
                label: t(`pages.goals.targets.modes.${value}`),
              }))}
            />
          </div>

          {mode === 'manual' ? (
            <NumberField
              id="target-kcal"
              label={t('pages.goals.targets.kcal')}
              unit="kcal"
              value={kcal}
              onChange={(event) => setKcal(event.target.value)}
              placeholder="2100"
              error={errors.kcal}
              required
            />
          ) : computed === null ? (
            // Names the fields rather than saying "incomplete": the user has to
            // know which ones to go and fill in.
            <p className="text-sm text-ink-muted">
              {t('pages.goals.targets.needs', {
                fields: missing.map((field) => t(MISSING_LABEL[field])).join(', '),
              })}
            </p>
          ) : (
            // The working, not just the answer (§14: a number gets a comparison).
            <div className="flex flex-col gap-1 font-mono text-2xs text-ink-faint">
              <p>
                <span className="text-ink">{formatNumber(computed.resting, locale, 0)}</span> kcal ·{' '}
                {t('pages.goals.targets.resting')}
              </p>
              <p>
                <span className="text-ink">{formatNumber(computed.maintenance, locale, 0)}</span> kcal ·{' '}
                {t('pages.goals.targets.maintenance')}
              </p>
              <p className="mt-2 text-sm text-ink">
                {formatNumber(computed.target, locale, 0)} kcal
                <span className="ml-2 font-mono text-2xs text-ink-faint">
                  {percent.format(DIRECTION_SHIFT[body.direction as Direction])}
                </span>
              </p>
            </div>
          )}

          <MacroCalculator
            kcal={effectiveKcal}
            weightKg={weightKg}
            locale={locale}
            onFill={({ proteinG, fatG, carbsG }) => {
              setProtein(String(Math.round(proteinG)))
              setFat(String(Math.round(fatG)))
              setCarbs(String(Math.round(carbsG)))
              setErrors({})
            }}
          />

          <NumberField
            id="target-protein"
            label={t('pages.goals.targets.protein')}
            unit="g"
            value={protein}
            onChange={(event) => setProtein(event.target.value)}
            error={errors.proteinG}
            required
          />
          <NumberField
            id="target-fat"
            label={t('pages.goals.targets.fat')}
            unit="g"
            value={fat}
            onChange={(event) => setFat(event.target.value)}
            error={errors.fatG}
            required
          />
          <NumberField
            id="target-carbs"
            label={t('pages.goals.targets.carbs')}
            unit="g"
            value={carbs}
            onChange={(event) => setCarbs(event.target.value)}
            error={errors.carbsG}
            required
          />

          {failed ? (
            <p role="alert" className="text-sm text-danger">
              {t('pages.goals.targets.saveFailed')}
            </p>
          ) : null}

          <Button type="submit" variant="primary" pending={pending}>
            {pending ? t('pages.goals.targets.saving') : t('pages.goals.targets.save')}
          </Button>

          <p className="font-mono text-2xs text-ink-faint">
            {t('pages.goals.targets.appliesFrom')}
          </p>
        </Panel>
      </form>
    </section>
  )
}

/**
 * The macro split, worked out rather than guessed at.
 *
 * Protein comes from body weight, fat from a share of the day's energy, and
 * carbohydrate from what is left. Both knobs are on screen with their defaults
 * filled in, and the three figures it produces stay editable — the arithmetic
 * is the app's, the decision is not.
 */
function MacroCalculator({
  kcal,
  weightKg,
  locale,
  onFill,
}: {
  kcal: number | null
  weightKg: number | null
  locale: string
  onFill: (macros: { proteinG: number; fatG: number; carbsG: number }) => void
}) {
  const { t } = useTranslation()
  const [perKg, setPerKg] = useState(formatForInput(MACRO_DEFAULTS.proteinPerKg, locale, 2))
  const [share, setShare] = useState(String(Math.round(MACRO_DEFAULTS.fatShare * 100)))
  const [error, setError] = useState<string | null>(null)

  const blocked =
    weightKg === null
      ? t('pages.goals.targets.calc.needsWeight')
      : kcal === null
        ? t('pages.goals.targets.calc.needsKcal')
        : null

  function fill() {
    const proteinPerKg = parseDecimalInput(perKg, PER_KG_LIMITS)
    const fatPercent = parseDecimalInput(share, SHARE_LIMITS)
    if (proteinPerKg === null || fatPercent === null) {
      setError(t('pages.goals.targets.calc.invalid'))
      return
    }
    setError(null)
    onFill(
      calculateMacros({
        kcal: kcal as number,
        weightKg: weightKg as number,
        proteinPerKg,
        fatShare: fatPercent / 100,
      }),
    )
  }

  return (
    <div className="rounded-md border border-line bg-surface-2 p-3">
      <p className="font-mono text-2xs text-ink-faint">{t('pages.goals.targets.calc.label')}</p>

      {blocked ? (
        <p className="mt-2 font-mono text-2xs text-ink-faint">{blocked}</p>
      ) : (
        <>
          <div className="mt-3 flex flex-col gap-4 md:flex-row">
            <div className="flex-1">
              <NumberField
                id="calc-per-kg"
                label={t('pages.goals.targets.calc.proteinPerKg')}
                unit="g"
                value={perKg}
                onChange={(event) => setPerKg(event.target.value)}
              />
            </div>
            <div className="flex-1">
              <NumberField
                id="calc-fat-share"
                label={t('pages.goals.targets.calc.fatShare')}
                unit="%"
                value={share}
                onChange={(event) => setShare(event.target.value)}
              />
            </div>
          </div>

          {error ? (
            <p role="alert" className="mt-2 text-sm text-danger">
              {error}
            </p>
          ) : null}

          <Button type="button" variant="quiet" className="mt-4 w-full" onClick={fill}>
            {t('pages.goals.targets.calc.apply')}
          </Button>
        </>
      )}
    </div>
  )
}

import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { NumberField } from '@/components/NumberField'
import { Panel } from '@/components/Panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatForInput, parseDecimalInput } from '@/lib/format'
import { todayKey } from '@/lib/date'
import { BODY_FAT_LIMITS, WEIGHT_LIMITS, type WeightEntry } from '@/lib/weight'

/**
 * Log a day, or correct one.
 *
 * There is one form rather than an "add" and an "edit": a day holds one weight,
 * so picking a day that already has one fills the fields with it and saving
 * replaces it. That is the same upsert the table's (user_id, date) key was
 * chosen for, and it means a mis-typed value is fixed by typing it again rather
 * than by hunting for an edit affordance in a 52px row.
 *
 * The component is keyed on the date by its parent, so switching days remounts
 * it with that day's values instead of syncing state in an effect.
 */
export function WeightForm({
  date,
  entry,
  onDateChange,
  onSave,
  onDelete,
}: {
  date: string
  /** The existing weigh-in for `date`, if there is one. */
  entry: WeightEntry | null
  onDateChange: (date: string) => void
  onSave: (entry: WeightEntry) => Promise<boolean>
  onDelete: (date: string) => Promise<boolean>
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language

  const [weight, setWeight] = useState(
    entry ? formatForInput(entry.weightKg, locale, WEIGHT_LIMITS.decimals) : '',
  )
  const [bodyFat, setBodyFat] = useState(
    entry?.bodyFatPct == null ? '' : formatForInput(entry.bodyFatPct, locale, BODY_FAT_LIMITS.decimals),
  )
  const [weightError, setWeightError] = useState<string | null>(null)
  const [bodyFatError, setBodyFatError] = useState<string | null>(null)
  const [failed, setFailed] = useState<'save' | 'delete' | null>(null)
  const [pending, setPending] = useState<'save' | 'delete' | null>(null)

  const today = todayKey()

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFailed(null)

    const weightKg = parseDecimalInput(weight, WEIGHT_LIMITS)
    // An empty body-fat field is "not measured", which is a different thing
    // from an unreadable one and must not be reported as an error.
    const bodyFatPct = bodyFat.trim() === '' ? null : parseDecimalInput(bodyFat, BODY_FAT_LIMITS)

    setWeightError(weightKg === null ? t('pages.weight.form.weightInvalid') : null)
    setBodyFatError(bodyFatPct === null && bodyFat.trim() !== '' ? t('pages.weight.form.bodyFatInvalid') : null)
    if (weightKg === null || (bodyFatPct === null && bodyFat.trim() !== '')) return

    setPending('save')
    const saved = await onSave({ date, weightKg, bodyFatPct })
    setPending(null)
    if (!saved) setFailed('save')
  }

  async function remove() {
    setFailed(null)
    setPending('delete')
    const deleted = await onDelete(date)
    setPending(null)
    if (!deleted) setFailed('delete')
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <Panel className="flex flex-col gap-5 p-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="weight-date">{t('pages.weight.form.date')}</Label>
          <Input
            id="weight-date"
            type="date"
            value={date}
            // A weigh-in for a day that has not happened is not a weigh-in.
            max={today}
            onChange={(event) => event.target.value && onDateChange(event.target.value)}
            className="font-mono
                       [&::-webkit-calendar-picker-indicator]:opacity-60
                       dark:[&::-webkit-calendar-picker-indicator]:invert"
          />
        </div>

        <NumberField
          id="weight-kg"
          label={t('pages.weight.form.weight')}
          unit="kg"
          value={weight}
          onChange={(event) => setWeight(event.target.value)}
          placeholder={formatForInput(82.4, locale, 1)}
          error={weightError ?? undefined}
          required
        />

        <NumberField
          id="weight-body-fat"
          label={t('pages.weight.form.bodyFat')}
          hint={t('pages.weight.form.optional')}
          unit="%"
          value={bodyFat}
          onChange={(event) => setBodyFat(event.target.value)}
          placeholder={formatForInput(18.5, locale, 1)}
          error={bodyFatError ?? undefined}
        />

        {failed ? (
          <p role="alert" className="text-sm text-danger">
            {t(failed === 'save' ? 'pages.weight.form.saveFailed' : 'pages.weight.form.deleteFailed')}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 md:flex-row-reverse md:justify-end">
          <Button type="submit" variant="primary" pending={pending === 'save'}>
            {pending === 'save' ? t('pages.weight.form.saving') : t('pages.weight.form.save')}
          </Button>

          {/* Deletion is a deliberate action on the day being edited, never an
              icon 8px from a value in a row (§10.1). It is undoable, so it does
              not ask for confirmation first (§14). The danger colour is one
              class on the quiet variant rather than a fifth button kind. */}
          {entry ? (
            <Button
              type="button"
              variant="quiet"
              pending={pending === 'delete'}
              onClick={remove}
              className="text-danger hover:border-danger"
            >
              {pending === 'delete' ? t('pages.weight.form.deleting') : t('pages.weight.form.delete')}
            </Button>
          ) : null}
        </div>
      </Panel>
    </form>
  )
}

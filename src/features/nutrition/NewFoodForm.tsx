import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { NumberField } from '@/components/NumberField'
import { Panel } from '@/components/Panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { parseDecimalInput } from '@/lib/format'
import { KCAL_LIMITS, LABEL_ORDER, NUTRIENT_LIMITS, type Nutrient } from '@/lib/nutrition'

/**
 * Manual entry. Step four of the lookup order, and the one that makes the
 * catalogue grow (GOAL.md §4). It is reached from the search's empty state,
 * which §10.8 calls the most important empty state in the app.
 *
 * Every value is per 100 g, in EU label order, so the form reads in the same
 * order as the packaging it is being copied off.
 *
 * The four with user-set targets are required; the rest are left empty when the
 * packaging does not say, and an empty field stays empty all the way to the
 * column. A zero typed here would be a claim that the food contains none.
 */
const REQUIRED: readonly Nutrient[] = ['fat', 'carbs', 'protein']

export interface NewFood {
  name: string
  brand: string | null
  values: Record<Nutrient, number | null>
}

export function NewFoodForm({
  pending,
  failed,
  onSubmit,
}: {
  pending: boolean
  failed: boolean
  onSubmit: (food: NewFood) => void
}) {
  const { t } = useTranslation()

  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [values, setValues] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }))

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next: Record<string, string> = {}
    const parsed: Partial<Record<Nutrient, number | null>> = {}

    if (name.trim().length === 0) next.name = t('pages.food.new.nameInvalid')

    const kcal = parseDecimalInput(values.kcal ?? '', KCAL_LIMITS)
    if (kcal === null) next.kcal = t('pages.food.new.requiredInvalid')

    for (const nutrient of LABEL_ORDER) {
      const raw = (values[nutrient] ?? '').trim()
      if (raw === '') {
        if (REQUIRED.includes(nutrient)) next[nutrient] = t('pages.food.new.requiredInvalid')
        parsed[nutrient] = null
        continue
      }
      const value = parseDecimalInput(raw, NUTRIENT_LIMITS)
      if (value === null) next[nutrient] = t('pages.food.new.valueInvalid')
      parsed[nutrient] = value
    }

    // The same two constraints the table carries, checked here so the message
    // names the field rather than arriving as a Postgres error.
    for (const [sub, whole] of [
      ['saturatedFat', 'fat'],
      ['sugars', 'carbs'],
    ] as const) {
      const subValue = parsed[sub]
      const wholeValue = parsed[whole]
      if (subValue !== null && subValue !== undefined && wholeValue != null && subValue > wholeValue) {
        next[sub] = t('pages.food.new.subValueTooHigh')
      }
    }

    setErrors(next)
    if (Object.keys(next).length > 0 || kcal === null) return

    onSubmit({
      name: name.trim(),
      brand: brand.trim() || null,
      values: {
        kcal,
        fat: parsed.fat ?? null,
        carbs: parsed.carbs ?? null,
        protein: parsed.protein ?? null,
        saturatedFat: parsed.saturatedFat ?? null,
        sugars: parsed.sugars ?? null,
        fibre: parsed.fibre ?? null,
        salt: parsed.salt ?? null,
      },
    })
  }

  return (
    <form onSubmit={submit} noValidate>
      {/* Said in the moment it matters, not in a settings page nobody opens:
          a user adding to a shared catalogue must know it is shared (§14). */}
      <p className="mb-4 max-w-[68ch] text-sm text-ink-muted">{t('pages.food.new.shared')}</p>

      <Panel className="flex flex-col gap-5 p-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="food-name">{t('pages.food.new.name')}</Label>
          <Input
            id="food-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={errors.name ? true : undefined}
            required
          />
          {errors.name ? (
            <p role="alert" className="text-sm text-danger">
              {errors.name}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="food-brand">
            {t('pages.food.new.brand')}
            <span className="text-ink-faint">{t('pages.food.new.optional')}</span>
          </Label>
          <Input id="food-brand" value={brand} onChange={(event) => setBrand(event.target.value)} />
        </div>

        <NumberField
          id="food-kcal"
          label={t('pages.food.nutrients.kcal')}
          unit="kcal"
          value={values.kcal ?? ''}
          onChange={(event) => set('kcal', event.target.value)}
          error={errors.kcal}
          required
        />

        {LABEL_ORDER.map((nutrient) => (
          <NumberField
            key={nutrient}
            id={`food-${nutrient}`}
            label={t(`pages.food.nutrients.${nutrient}`)}
            hint={REQUIRED.includes(nutrient) ? undefined : t('pages.food.new.optional')}
            unit="g"
            value={values[nutrient] ?? ''}
            onChange={(event) => set(nutrient, event.target.value)}
            error={errors[nutrient]}
          />
        ))}

        {failed ? (
          <p role="alert" className="text-sm text-danger">
            {t('pages.food.new.saveFailed')}
          </p>
        ) : null}

        <Button type="submit" variant="primary" pending={pending}>
          {pending ? t('pages.food.new.saving') : t('pages.food.new.save')}
        </Button>
      </Panel>
    </form>
  )
}

import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { NumberField } from '@/components/NumberField'
import { Panel } from '@/components/Panel'
import { SegmentedControl } from '@/components/SegmentedControl'
import { Button } from '@/components/ui/button'
import { formatNumber, parseDecimalInput } from '@/lib/format'
import {
  MEAL_TYPES,
  portionTotals,
  QUANTITY_LIMITS,
  type FoodNutrients,
  type MealType,
} from '@/lib/nutrition'

/**
 * How much, and at which meal. The last step of logging a food and the whole of
 * editing one.
 *
 * The energy for the quantity typed is shown as it is typed: a portion is a
 * number nobody has an instinct for, and 250 g of something at 380 kcal/100 g
 * is the figure that decides whether it gets logged as 250 or 150.
 */
export function PortionForm({
  food,
  quantityG = '',
  mealType: initialMeal = 'breakfast',
  pending,
  failed,
  submitLabel,
  withMeal = true,
  failedMessage,
  onSubmit,
}: {
  food: { name: string; brand: string | null; nutrients: FoodNutrients; servingSizeG?: number | null; servingLabel?: string | null }
  quantityG?: string
  mealType?: MealType
  pending: boolean
  failed: boolean
  submitLabel: string
  /** Off for a recipe ingredient, which belongs to a recipe and not to a meal. */
  withMeal?: boolean
  /** What a failed save says, when it is not a portion of the day. */
  failedMessage?: string
  onSubmit: (portion: { quantityG: number; mealType: MealType }) => void
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language

  const [quantity, setQuantity] = useState(quantityG)
  const [mealType, setMealType] = useState<MealType>(initialMeal)
  const [error, setError] = useState<string | null>(null)

  const parsed = parseDecimalInput(quantity, QUANTITY_LIMITS)
  const preview = parsed === null ? null : portionTotals({ nutrients: food.nutrients, quantityG: parsed })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (parsed === null) {
      setError(t('pages.food.portion.quantityInvalid'))
      return
    }
    setError(null)
    onSubmit({ quantityG: parsed, mealType })
  }

  return (
    <form onSubmit={submit} noValidate>
      <Panel className="flex flex-col gap-5 p-4">
        <div>
          <p className="text-ink">{food.name}</p>
          {food.brand ? <p className="mt-0.5 text-sm text-ink-muted">{food.brand}</p> : null}
        </div>

        <NumberField
          id="portion-quantity"
          label={t('pages.food.portion.quantity')}
          hint={
            food.servingSizeG && food.servingLabel
              ? ` · ${food.servingLabel} = ${formatNumber(food.servingSizeG, locale, 0)} g`
              : undefined
          }
          unit="g"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          placeholder="100"
          error={error ?? undefined}
          required
        />

        {withMeal ? <MealPicker value={mealType} onChange={setMealType} /> : null}

        <MacroLine
          values={
            preview && {
              kcal: preview.kcal ?? 0,
              protein: preview.protein ?? 0,
              fat: preview.fat ?? 0,
              carbs: preview.carbs ?? 0,
            }
          }
        />

        {failed ? (
          <p role="alert" className="text-sm text-danger">
            {failedMessage ?? t('pages.food.portion.saveFailed')}
          </p>
        ) : null}

        <Button type="submit" variant="primary" pending={pending}>
          {submitLabel}
        </Button>
      </Panel>
    </form>
  )
}

/** Which meal, as the four-way control every portion form uses. */
export function MealPicker({ value, onChange }: { value: MealType; onChange: (meal: MealType) => void }) {
  const { t } = useTranslation()
  // Four options is the ceiling for a segmented control (§10.7), and there are
  // exactly four meals.
  return (
    <div className="flex flex-col items-start gap-2">
      <p className="font-mono text-2xs text-ink-faint">{t('pages.food.portion.meal')}</p>
      <SegmentedControl<MealType>
        label={t('pages.food.portion.meal')}
        value={value}
        onChange={onChange}
        segments={MEAL_TYPES.map((meal) => ({ value: meal, label: t(`pages.food.meals.${meal}`) }))}
      />
    </div>
  )
}

/**
 * Energy and the three macros of a portion, as it is being typed. A no-break
 * space before every unit keeps a number and its unit on one line, and an
 * empty line holds its height so the form does not jump on the first value.
 */
export function MacroLine({
  values,
}: {
  values: { kcal: number; protein: number; fat: number; carbs: number } | null
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const g = (n: number, key: 'protein' | 'fat' | 'carbs') =>
    `${formatNumber(n, locale, 1)}\u00a0g\u00a0${t(`pages.food.nutrients.${key}`)}`
  return (
    <p className="font-mono text-2xs text-ink-faint">
      {values === null ? (
        '\u00a0'
      ) : (
        <>
          <span className="text-ink">{formatNumber(values.kcal, locale, 0)}</span>
          {'\u00a0kcal · '}
          {g(values.protein, 'protein')} · {g(values.fat, 'fat')} · {g(values.carbs, 'carbs')}
        </>
      )}
    </p>
  )
}

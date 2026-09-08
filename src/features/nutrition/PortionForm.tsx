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
  onSubmit,
}: {
  food: { name: string; brand: string | null; nutrients: FoodNutrients; servingSizeG?: number | null; servingLabel?: string | null }
  quantityG?: string
  mealType?: MealType
  pending: boolean
  failed: boolean
  submitLabel: string
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

        {/* Four options is the ceiling for a segmented control (§10.7), and
            there are exactly four meals. */}
        <div className="flex flex-col gap-2">
          <p className="font-mono text-2xs text-ink-faint">{t('pages.food.portion.meal')}</p>
          <SegmentedControl<MealType>
            label={t('pages.food.portion.meal')}
            value={mealType}
            onChange={setMealType}
            segments={MEAL_TYPES.map((value) => ({ value, label: t(`pages.food.meals.${value}`) }))}
          />
        </div>

        <p className="font-mono text-2xs text-ink-faint">
          {preview === null ? (
            t('pages.food.portion.previewPending')
          ) : (
            <>
              <span className="text-ink">{formatNumber(preview.kcal ?? 0, locale, 0)}</span> kcal ·{' '}
              {formatNumber(preview.protein ?? 0, locale, 1)} g {t('pages.food.nutrients.protein')} ·{' '}
              {formatNumber(preview.fat ?? 0, locale, 1)} g {t('pages.food.nutrients.fat')} ·{' '}
              {formatNumber(preview.carbs ?? 0, locale, 1)} g {t('pages.food.nutrients.carbs')}
            </>
          )}
        </p>

        {failed ? (
          <p role="alert" className="text-sm text-danger">
            {t('pages.food.portion.saveFailed')}
          </p>
        ) : null}

        <Button type="submit" variant="primary" pending={pending}>
          {submitLabel}
        </Button>
      </Panel>
    </form>
  )
}

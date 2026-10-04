import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { NumberField } from '@/components/NumberField'
import { Panel } from '@/components/Panel'
import { SegmentedControl } from '@/components/SegmentedControl'
import { Button } from '@/components/ui/button'
import type { Recipe } from '@/features/nutrition/useRecipes'
import { formatNumber, parseDecimalInput } from '@/lib/format'
import { MEAL_TYPES, QUANTITY_LIMITS, type MealType } from '@/lib/nutrition'
import { recipeShare, type RecipePortion } from '@/lib/recipe'

/** Up to a hundred shakes or a pot in a hundred parts; past that it is a typo. */
const COUNT_LIMITS = { min: 0.1, max: 100, decimals: 2 } as const
const PARTS_LIMITS = { min: 1, max: 100, decimals: 0 } as const

/**
 * How much of a recipe, and at which meal.
 *
 * A recipe without a made weight is counted in servings (one shake, two). A
 * pot with one is portioned as one part in n, or in grams off the scale.
 */
export function RecipePortionForm({
  recipe,
  mealType: initialMeal = 'breakfast',
  pending,
  failed,
  onSubmit,
}: {
  recipe: Recipe
  mealType?: MealType
  pending: boolean
  failed: boolean
  onSubmit: (portion: { mealType: MealType; factor: number; grams: number | null }) => void
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const pot = recipe.totalG !== null

  const [mode, setMode] = useState<'fraction' | 'grams'>('fraction')
  const [value, setValue] = useState(pot ? '' : '1')
  const [mealType, setMealType] = useState<MealType>(initialMeal)
  const [error, setError] = useState<string | null>(null)

  const portion: RecipePortion | null = (() => {
    if (!pot) {
      const count = parseDecimalInput(value, COUNT_LIMITS)
      return count === null ? null : { kind: 'servings', count }
    }
    if (mode === 'grams') {
      const grams = parseDecimalInput(value, QUANTITY_LIMITS)
      return grams === null ? null : { kind: 'grams', grams }
    }
    const of = parseDecimalInput(value, PARTS_LIMITS)
    return of === null ? null : { kind: 'fraction', of }
  })()
  const share = portion ? recipeShare(portion, recipe.totalG) : null

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (share === null || portion === null) {
      setError(t('pages.recipes.portion.invalid'))
      return
    }
    setError(null)
    onSubmit({ mealType, factor: share, grams: portion.kind === 'grams' ? portion.grams : null })
  }

  const field = !pot
    ? { label: t('pages.recipes.portion.servings'), unit: '×', placeholder: '1' }
    : mode === 'grams'
      ? { label: t('pages.recipes.portion.grams'), unit: 'g', placeholder: '300' }
      : { label: t('pages.recipes.portion.parts'), unit: t('pages.recipes.portion.partsUnit'), placeholder: '8' }

  return (
    <form onSubmit={submit} noValidate>
      <Panel className="flex flex-col gap-5 p-4">
        <p className="text-ink">{recipe.name}</p>

        {pot ? (
          <SegmentedControl<'fraction' | 'grams'>
            label={t('pages.recipes.portion.mode')}
            value={mode}
            onChange={(next) => {
              setMode(next)
              setValue('')
              setError(null)
            }}
            segments={[
              { value: 'fraction', label: t('pages.recipes.portion.byParts') },
              { value: 'grams', label: t('pages.recipes.portion.byGrams') },
            ]}
          />
        ) : null}

        <NumberField
          id="recipe-portion"
          label={field.label}
          unit={field.unit}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={field.placeholder}
          error={error ?? undefined}
          required
        />

        <div className="flex flex-col items-start gap-2">
          <p className="font-mono text-2xs text-ink-faint">{t('pages.food.portion.meal')}</p>
          <SegmentedControl<MealType>
            label={t('pages.food.portion.meal')}
            value={mealType}
            onChange={setMealType}
            segments={MEAL_TYPES.map((meal) => ({ value: meal, label: t(`pages.food.meals.${meal}`) }))}
          />
        </div>

        <p className="font-mono text-2xs text-ink-faint">
          {share === null ? (
            ' '
          ) : (
            <>
              <span className="text-ink">{formatNumber(recipe.totals.kcal.value * share, locale, 0)}</span> kcal ·{' '}
              {formatNumber(recipe.totals.protein.value * share, locale, 1)} g {t('pages.food.nutrients.protein')} ·{' '}
              {formatNumber(recipe.totals.fat.value * share, locale, 1)} g {t('pages.food.nutrients.fat')} ·{' '}
              {formatNumber(recipe.totals.carbs.value * share, locale, 1)} g {t('pages.food.nutrients.carbs')}
            </>
          )}
        </p>

        {failed ? (
          <p role="alert" className="text-sm text-danger">
            {t('pages.food.portion.saveFailed')}
          </p>
        ) : null}

        <Button type="submit" variant="primary" pending={pending}>
          {pending ? t('pages.food.portion.saving') : t('pages.food.portion.save')}
        </Button>
      </Panel>
    </form>
  )
}

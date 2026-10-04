import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { NumberField } from '@/components/NumberField'
import { Panel } from '@/components/Panel'
import { SegmentedControl } from '@/components/SegmentedControl'
import { Button } from '@/components/ui/button'
import { MacroLine, MealPicker } from '@/features/nutrition/PortionForm'
import type { Recipe } from '@/features/nutrition/useRecipes'
import { parseDecimalInput } from '@/lib/format'
import { QUANTITY_LIMITS, type MealType } from '@/lib/nutrition'
import { recipeShare, type RecipePortion } from '@/lib/recipe'

/** A hundred shakes, or a pot in a hundred parts; past that it is a typo. */
const WHOLE_LIMITS = { min: 0.1, max: 100, decimals: 2 } as const
const PARTS_LIMITS = { min: 1, max: 100, decimals: 0 } as const

type Mode = 'whole' | 'fraction' | 'grams'

/**
 * How much of a recipe, and at which meal: the whole recipe (once, twice), a
 * part of it (split into n), or grams off the scale when it has a made weight.
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
  const { t } = useTranslation()
  const weighed = recipe.totalG !== null

  // A recipe with a made weight is a pot, and a pot is rarely eaten whole.
  const [mode, setMode] = useState<Mode>(weighed ? 'fraction' : 'whole')
  const [value, setValue] = useState(weighed ? '' : '1')
  const [mealType, setMealType] = useState<MealType>(initialMeal)
  const [error, setError] = useState(false)

  const FIELDS = {
    whole: { label: t('pages.recipes.portion.whole'), unit: '×', placeholder: '1', limits: WHOLE_LIMITS, invalid: t('pages.recipes.portion.wholeInvalid') },
    fraction: { label: t('pages.recipes.portion.parts'), unit: t('pages.recipes.portion.partsUnit'), placeholder: '8', limits: PARTS_LIMITS, invalid: t('pages.recipes.portion.partsInvalid') },
    grams: { label: t('pages.recipes.portion.grams'), unit: 'g', placeholder: '300', limits: QUANTITY_LIMITS, invalid: t('pages.food.portion.quantityInvalid') },
  }
  const field = FIELDS[mode]

  const parsed = parseDecimalInput(value, field.limits)
  const portion: RecipePortion | null =
    parsed === null
      ? null
      : mode === 'whole'
        ? { kind: 'servings', count: parsed }
        : mode === 'fraction'
          ? { kind: 'fraction', of: parsed }
          : { kind: 'grams', grams: parsed }
  const share = portion ? recipeShare(portion, recipe.totalG) : null

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (share === null || portion === null) return setError(true)
    setError(false)
    onSubmit({ mealType, factor: share, grams: portion.kind === 'grams' ? portion.grams : null })
  }

  const modes: Mode[] = weighed ? ['whole', 'fraction', 'grams'] : ['whole', 'fraction']
  const LABELS = {
    whole: t('pages.recipes.portion.byWhole'),
    fraction: t('pages.recipes.portion.byParts'),
    grams: t('pages.recipes.portion.byGrams'),
  }

  return (
    <form onSubmit={submit} noValidate>
      <Panel className="flex flex-col gap-5 p-4">
        <p className="text-ink">{recipe.name}</p>

        <div className="flex flex-col items-start">
          <SegmentedControl<Mode>
            label={t('pages.recipes.portion.mode')}
            value={mode}
            onChange={(next) => {
              setMode(next)
              setValue(next === 'whole' ? '1' : '')
              setError(false)
            }}
            segments={modes.map((item) => ({ value: item, label: LABELS[item] }))}
          />
        </div>

        <NumberField
          id="recipe-portion"
          label={field.label}
          unit={field.unit}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={field.placeholder}
          error={error ? field.invalid : undefined}
          required
        />

        <MealPicker value={mealType} onChange={setMealType} />

        <MacroLine
          values={
            share === null
              ? null
              : {
                  kcal: recipe.totals.kcal.value * share,
                  protein: recipe.totals.protein.value * share,
                  fat: recipe.totals.fat.value * share,
                  carbs: recipe.totals.carbs.value * share,
                }
          }
        />

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

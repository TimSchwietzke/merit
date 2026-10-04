import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { NumberField } from '@/components/NumberField'
import { SegmentedControl } from '@/components/SegmentedControl'
import { Button } from '@/components/ui/button'
import { MacroLine, MealPicker } from '@/features/nutrition/PortionForm'
import { formatForInput, parseDecimalInput } from '@/lib/format'
import type { MealType } from '@/lib/nutrition'
import { portionOf, recipeShare, type RecipePortion } from '@/lib/recipe'

/** A hundred shakes, or a pot in a hundred parts; past that it is a typo. */
const WHOLE_LIMITS = { min: 0.1, max: 100, decimals: 2 } as const
const PART_LIMITS = { min: 1, max: 100, decimals: 0 } as const

type Kind = RecipePortion['kind']

/**
 * How much of a recipe, and at which meal: the whole of it (once, twice) or
 * one part of it split into n. Used to log a recipe and to change a logged one.
 */
export function RecipePortionForm({
  whole,
  share: initialShare = 1,
  mealType: initialMeal = 'breakfast',
  pending,
  failed,
  submitLabel,
  onSubmit,
}: {
  /** The whole recipe's energy and macros; the preview scales them. */
  whole: { kcal: number; protein: number; fat: number; carbs: number }
  share?: number
  mealType?: MealType
  pending: boolean
  failed: boolean
  submitLabel: string
  onSubmit: (portion: { mealType: MealType; share: number }) => void
}) {
  const { t, i18n } = useTranslation()
  const initial = portionOf(initialShare)

  const [kind, setKind] = useState<Kind>(initial.kind)
  const [value, setValue] = useState(
    initial.kind === 'part' ? String(initial.of) : formatForInput(initial.times, i18n.language, 2),
  )
  const [mealType, setMealType] = useState<MealType>(initialMeal)
  const [error, setError] = useState(false)

  const FIELDS = {
    whole: { label: t('pages.recipes.portion.whole'), unit: '×', placeholder: '1', limits: WHOLE_LIMITS, invalid: t('pages.recipes.portion.wholeInvalid') },
    part: { label: t('pages.recipes.portion.parts'), unit: t('pages.recipes.portion.partsUnit'), placeholder: '8', limits: PART_LIMITS, invalid: t('pages.recipes.portion.partsInvalid') },
  }
  const field = FIELDS[kind]

  const parsed = parseDecimalInput(value, field.limits)
  const share =
    parsed === null ? null : recipeShare(kind === 'whole' ? { kind, times: parsed } : { kind, of: parsed })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (share === null) return setError(true)
    setError(false)
    onSubmit({ mealType, share })
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col items-start">
        <SegmentedControl<Kind>
          label={t('pages.recipes.portion.mode')}
          value={kind}
          onChange={(next) => {
            setKind(next)
            setValue(next === 'whole' ? '1' : '')
            setError(false)
          }}
          segments={[
            { value: 'whole', label: t('pages.recipes.portion.byWhole') },
            { value: 'part', label: t('pages.recipes.portion.byParts') },
          ]}
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
                kcal: whole.kcal * share,
                protein: whole.protein * share,
                fat: whole.fat * share,
                carbs: whole.carbs * share,
              }
        }
      />

      {failed ? (
        <p role="alert" className="text-sm text-danger">
          {t('pages.food.portion.saveFailed')}
        </p>
      ) : null}

      <Button type="submit" variant="primary" pending={pending}>
        {submitLabel}
      </Button>
    </form>
  )
}

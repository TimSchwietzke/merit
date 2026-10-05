import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { NumberField } from '@/components/NumberField'
import { SegmentedControl } from '@/components/SegmentedControl'
import { Button } from '@/components/ui/button'
import { MacroLine, MealPicker } from '@/features/nutrition/PortionForm'
import { formatForInput, parseDecimalInput } from '@/lib/format'
import type { MealType } from '@/lib/nutrition'
import { MAX_PARTS, recipeShare, type RecipePortion } from '@/lib/recipe'

/** A hundred shakes, or a pot in a hundred parts; past that it is a typo. */
const WHOLE_LIMITS = { min: 0.1, max: 100, decimals: 2 } as const
const PART_LIMITS = { min: 1, max: MAX_PARTS, decimals: 0 } as const

type Kind = RecipePortion['kind']

/**
 * How much of a recipe, and at which meal: the whole of it (once, twice) or
 * one part of it split into n. Used to log a recipe and to change a logged one.
 */
export function RecipePortionForm({
  whole,
  portion: initial = { kind: 'whole', times: 1 },
  mealType: initialMeal = 'breakfast',
  pending,
  failed,
  submitLabel,
  onSubmit,
}: {
  /** The whole recipe's energy and macros; the preview scales them. */
  whole: { kcal: number; protein: number; fat: number; carbs: number }
  /** The portion the form opens on: what was logged, or once the whole. */
  portion?: RecipePortion
  mealType?: MealType
  pending: boolean
  failed: boolean
  submitLabel: string
  onSubmit: (portion: { mealType: MealType; portion: RecipePortion }) => void
}) {
  const { t, i18n } = useTranslation()

  const [kind, setKind] = useState<Kind>(initial.kind)
  const [times, setTimes] = useState(
    initial.kind === 'whole' ? formatForInput(initial.times, i18n.language, 2) : '1',
  )
  const [eaten, setEaten] = useState(initial.kind === 'part' ? String(initial.eaten) : '1')
  const [of, setOf] = useState(initial.kind === 'part' ? String(initial.of) : '')
  const [mealType, setMealType] = useState<MealType>(initialMeal)
  const [error, setError] = useState(false)

  // Parsed once; which of the two part fields is wrong is said per field.
  const parsedTimes = parseDecimalInput(times, WHOLE_LIMITS)
  const parsedEaten = parseDecimalInput(eaten, PART_LIMITS)
  const parsedOf = parseDecimalInput(of, PART_LIMITS)
  const portion: RecipePortion | null =
    kind === 'whole'
      ? parsedTimes === null
        ? null
        : { kind, times: parsedTimes }
      : parsedEaten === null || parsedOf === null
        ? null
        : { kind, eaten: parsedEaten, of: parsedOf }
  const share = portion ? recipeShare(portion) : null
  const tooMany = parsedEaten !== null && parsedOf !== null && parsedEaten > parsedOf
  const eatenBad = error && (parsedEaten === null || tooMany)
  const ofBad = error && (parsedOf === null || tooMany)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (share === null || portion === null) return setError(true)
    setError(false)
    onSubmit({ mealType, portion })
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col items-start">
        <SegmentedControl<Kind>
          label={t('pages.recipes.portion.mode')}
          value={kind}
          onChange={(next) => {
            setKind(next)
            setError(false)
          }}
          segments={[
            { value: 'whole', label: t('pages.recipes.portion.byWhole') },
            { value: 'part', label: t('pages.recipes.portion.byParts') },
          ]}
        />
      </div>

      {kind === 'whole' ? (
        <NumberField
          id="recipe-portion"
          label={t('pages.recipes.portion.whole')}
          unit="×"
          value={times}
          onChange={(event) => setTimes(event.target.value)}
          placeholder="1"
          error={error ? t('pages.recipes.portion.wholeInvalid') : undefined}
          required
        />
      ) : (
        // Two numbers, read as one: 2 of 5 parts. Side by side, so the pair is
        // the field rather than two questions.
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              id="recipe-portion"
              label={t('pages.recipes.portion.eaten')}
              unit=""
              value={eaten}
              onChange={(event) => setEaten(event.target.value)}
              placeholder="1"
              required
              aria-invalid={eatenBad || undefined}
              aria-describedby={eatenBad ? 'recipe-parts-error' : undefined}
              className={eatenBad ? 'border-danger' : undefined}
            />
            <NumberField
              id="recipe-parts"
              label={t('pages.recipes.portion.parts')}
              unit=""
              value={of}
              onChange={(event) => setOf(event.target.value)}
              placeholder="8"
              required
              aria-invalid={ofBad || undefined}
              aria-describedby={ofBad ? 'recipe-parts-error' : undefined}
              className={ofBad ? 'border-danger' : undefined}
            />
          </div>
          {error ? (
            <p id="recipe-parts-error" role="alert" className="text-sm text-danger">
              {t('pages.recipes.portion.partsInvalid')}
            </p>
          ) : null}
        </div>
      )}

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

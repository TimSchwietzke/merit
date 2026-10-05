import { useEffect, useId, useRef, useState, type MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { toast } from 'sonner'

import { Rows } from '@/components/Rows'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet } from '@/components/ui/sheet'
import { useRecipes } from '@/features/nutrition/useRecipes'
import { formatNumber } from '@/lib/format'
import { defaultRecipeName, mealIngredients, mealTitle, type MealEntry, type MealIngredient } from '@/lib/meal-recipe'
import { QUANTITY_LIMITS, type MealType } from '@/lib/nutrition'

/**
 * One meal's foods kept as a recipe. Amounts are what was logged and are not
 * edited here; the recipe editor does that afterwards.
 */
export function SaveMealSheet({
  open,
  onOpenChange,
  meal,
  entries,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  meal: MealType
  /** The meal's logged entries, in day-view order. */
  entries: readonly MealEntry[]
}) {
  const { t } = useTranslation()
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t('pages.recipes.fromMeal.title')} closeLabel={t('common.close')}>
      {/* The sheet unmounts its content when closed, so every opening starts
          from the current entries with nothing removed, no name, no error. */}
      <Content meal={meal} entries={entries} onSaved={() => onOpenChange(false)} />
    </Sheet>
  )
}

function Content({
  meal,
  entries,
  onSaved,
}: {
  meal: MealType
  entries: readonly MealEntry[]
  onSaved: () => void
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const { recipes, status, saveFromMeal } = useRecipes()
  const nameId = useId()
  const nameRef = useRef<HTMLInputElement>(null)
  const overLimitId = useId()

  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set())
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const submitRef = useRef<HTMLButtonElement>(null)

  // The submit button is disabled while saving, so focus falls to the body;
  // after a failure it lands back on the button, which is the retry.
  useEffect(() => {
    if (failed) submitRef.current?.focus()
  }, [failed])

  const items = mealIngredients(entries).filter((item) => !removed.has(item.foodId))
  const overLimit = items.some((item) => item.overLimit)
  const title = mealTitle(t(`pages.food.meals.${meal}`), locale)

  function remove(foodId: string, event: MouseEvent<HTMLButtonElement>) {
    // The pressed button leaves with its row; focus goes to the neighbour
    // that stays, or to the name field when none does.
    const li = event.currentTarget.closest('li')
    const next = (li?.nextElementSibling ?? li?.previousElementSibling)?.querySelector('button')
    setRemoved((current) => new Set(current).add(foodId))
    ;(next ?? nameRef.current)?.focus()
  }

  function removeLabel(item: MealIngredient) {
    return item.brand
      ? t('pages.recipes.fromMeal.removeBranded', { name: item.name, brand: item.brand })
      : t('pages.recipes.fromMeal.remove', { name: item.name })
  }

  async function save() {
    if (items.length === 0 || overLimit || saving) return
    setSaving(true)
    setFailed(false)
    // As typed: the database trims it and names a blank one after the meal.
    const saved = await saveFromMeal(name, title, items)
    setSaving(false)
    if (!saved) return setFailed(true)
    onSaved()
    toast(t('pages.recipes.fromMeal.saved', { name: saved.name }))
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        void save()
      }}
    >
      {items.length > 0 ? (
        <div>
          <Rows>
            {items.map((item) => (
              <li key={item.foodId} className="flex min-h-[52px] items-center gap-3 py-1 pl-4 pr-1">
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{item.name}</span>
                  {item.brand ? <span className="block truncate text-sm text-ink-muted">{item.brand}</span> : null}
                </span>
                <span
                  className={`shrink-0 font-mono text-2xs tabular-nums ${item.overLimit ? 'text-danger' : 'text-ink-faint'}`}
                >
                  {item.overLimit ? (
                    <>
                      <span aria-hidden>! </span>
                      <span className="sr-only">{t('pages.recipes.fromMeal.overLimitItem')} </span>
                    </>
                  ) : null}
                  {formatNumber(item.quantityG, locale, 0)} g
                </span>
                <Button
                  type="button"
                  variant="bare"
                  size="icon"
                  aria-label={removeLabel(item)}
                  title={removeLabel(item)}
                  disabled={saving}
                  onClick={(event) => remove(item.foodId, event)}
                >
                  <X size={16} strokeWidth={1.75} aria-hidden />
                </Button>
              </li>
            ))}
          </Rows>
          {overLimit ? (
            <p id={overLimitId} className="mt-2 text-sm text-danger">
              {t('pages.recipes.fromMeal.overLimit', { max: formatNumber(QUANTITY_LIMITS.max, locale, 0) })}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor={nameId}>{t('pages.recipes.name')}</Label>
        <Input
          ref={nameRef}
          id={nameId}
          value={name}
          maxLength={120}
          disabled={saving}
          // A preview from the recipes loaded here; the database decides on save.
          placeholder={
            status === 'loading' || status === 'error' ? undefined : defaultRecipeName(title, recipes.map((r) => r.name))
          }
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      {failed ? (
        <p role="alert" className="text-sm text-danger">
          {t('pages.recipes.saveFailed')}
        </p>
      ) : null}

      <Button
        ref={submitRef}
        type="submit"
        variant="primary"
        pending={saving}
        disabled={items.length === 0 || overLimit}
        aria-describedby={overLimit ? overLimitId : undefined}
      >
        {t('pages.recipes.fromMeal.save')}
      </Button>
    </form>
  )
}

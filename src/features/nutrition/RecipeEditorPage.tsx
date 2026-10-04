import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { EmptyState } from '@/components/EmptyState'
import { NumberField } from '@/components/NumberField'
import { PageHeader } from '@/components/PageHeader'
import { Row, Rows } from '@/components/Rows'
import { SectionHead } from '@/components/SectionHead'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet } from '@/components/ui/sheet'
import { useRecipes, type Recipe, type RecipeItem } from '@/features/nutrition/useRecipes'
import { todayKey } from '@/lib/date'
import { formatForInput, formatNumber, parseDecimalInput } from '@/lib/format'
import { QUANTITY_LIMITS } from '@/lib/nutrition'

/** A pot can weigh more than any one portion. */
const TOTAL_LIMITS = { min: 1, max: 99999, decimals: 1 } as const

/**
 * One recipe: its name, its made weight, its ingredients.
 *
 * Every change is written as it is made, there is no draft and no save
 * button. Adding an ingredient leaves this screen for the food search and comes
 * back, and a draft would not survive the trip.
 */
export default function RecipeEditorPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const { recipes, status, ...actions } = useRecipes()
  const recipe = recipes.find((row) => row.id === id)

  if (!recipe) {
    return (
      <p className="font-mono text-2xs text-ink-faint">
        {t(status === 'loading' ? 'common.loading' : status === 'error' ? 'pages.recipes.loadFailed' : 'common.notFound')}
      </p>
    )
  }

  // Keyed on the recipe, so the fields start from its values once it has loaded.
  return <Editor key={recipe.id} recipe={recipe} {...actions} />
}

function Editor({
  recipe,
  update,
  remove,
  restore,
  addItem,
  updateItem,
  removeItem,
}: { recipe: Recipe } & Pick<
  ReturnType<typeof useRecipes>,
  'update' | 'remove' | 'restore' | 'addItem' | 'updateItem' | 'removeItem'
>) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const navigate = useNavigate()
  const [params] = useSearchParams()
  // The day add-food was opened for, carried round the whole recipe loop so the
  // next thing logged lands on it and not on today.
  const date = params.get('date') ?? todayKey()

  const [name, setName] = useState(recipe.name)
  const [total, setTotal] = useState(
    recipe.totalG === null ? '' : formatForInput(recipe.totalG, locale, TOTAL_LIMITS.decimals),
  )
  const [totalError, setTotalError] = useState(false)
  const [editing, setEditing] = useState<RecipeItem | null>(null)

  // What is typed, held where the unmount below can read it: the back gesture
  // leaves this screen without a blur, and the edit must not leave with it.
  const typed = useRef({ name, total })
  typed.current = { name, total }
  const latest = useRef(recipe)
  latest.current = recipe

  function nameChange(value: string, current: Recipe) {
    const trimmed = value.trim()
    return trimmed && trimmed !== current.name ? trimmed : null
  }

  function totalChange(value: string, current: Recipe): { totalG: number | null } | 'invalid' | null {
    if (value.trim() === '') return current.totalG === null ? null : { totalG: null }
    const parsed = parseDecimalInput(value, TOTAL_LIMITS)
    if (parsed === null) return 'invalid'
    return parsed === current.totalG ? null : { totalG: parsed }
  }

  async function saveName() {
    const next = nameChange(name, recipe)
    if (!name.trim()) return setName(recipe.name)
    if (!next) return
    if (!(await update(recipe.id, { name: next }))) {
      toast(t('pages.recipes.saveFailed'))
      setName(recipe.name)
    }
  }

  async function saveTotal() {
    const next = totalChange(total, recipe)
    setTotalError(next === 'invalid')
    if (!next || next === 'invalid') return
    if (!(await update(recipe.id, next))) {
      toast(t('pages.recipes.saveFailed'))
      setTotal(recipe.totalG === null ? '' : formatForInput(recipe.totalG, locale, TOTAL_LIMITS.decimals))
    }
  }

  useEffect(
    () => () => {
      const current = latest.current
      const name = nameChange(typed.current.name, current)
      const total = totalChange(typed.current.total, current)
      if (name || (total && total !== 'invalid')) {
        // Toasted on whatever screen comes next: sonner outlives this one.
        void update(current.id, { ...(name ? { name } : {}), ...(total && total !== 'invalid' ? total : {}) }).then(
          (ok) => {
            if (!ok) toast(t('pages.recipes.saveFailed'))
          },
        )
      }
    },
    // On unmount only; the refs carry the latest values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  async function deleteRecipe() {
    if (!(await remove(recipe.id))) return toast(t('pages.recipes.saveFailed'))
    navigate(`/food/recipes?date=${date}`)
    // Undo rather than a question first (§14).
    toast(t('pages.recipes.deleted', { name: recipe.name }), {
      action: {
        label: t('common.undo'),
        onClick: () =>
          void restore(recipe).then((ok) => {
            if (!ok) toast(t('pages.recipes.restoreFailed', { name: recipe.name }))
          }),
      },
    })
  }

  async function removeIngredient(item: RecipeItem) {
    if (!(await removeItem(item.id))) return toast(t('pages.recipes.saveFailed'))
    toast(t('pages.recipes.itemRemoved', { name: item.food.name }), {
      action: {
        label: t('common.undo'),
        onClick: () =>
          void addItem(recipe.id, item.food.id, item.quantityG, item.createdAt).then((ok) => {
            if (!ok) toast(t('pages.recipes.restoreFailed', { name: item.food.name }))
          }),
      },
    })
  }

  return (
    <>
      <PageHeader title={name.trim() || recipe.name} />

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="recipe-name">{t('pages.recipes.name')}</Label>
          <Input
            id="recipe-name"
            value={name}
            maxLength={120}
            // A new recipe arrives here with a working name, selected, so
            // typing replaces it.
            autoFocus={params.get('new') === '1'}
            onFocus={(event) => params.get('new') === '1' && event.target.select()}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => void saveName()}
            onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
          />
        </div>

        <NumberField
          id="recipe-total"
          label={t('pages.recipes.total')}
          hint={t('pages.recipes.totalHint')}
          unit="g"
          value={total}
          onChange={(event) => setTotal(event.target.value)}
          onBlur={() => void saveTotal()}
          onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
          error={totalError ? t('pages.recipes.totalInvalid') : undefined}
        />
      </div>

      <section className="mt-8">
        <SectionHead
          label={t('pages.recipes.ingredientsLabel')}
          hint={`${formatNumber(recipe.totals.kcal.value, locale, 0)} kcal`}
        />
        {recipe.items.length === 0 ? (
          <EmptyState>{t('pages.recipes.noIngredients')}</EmptyState>
        ) : (
          <Rows>
            {recipe.items.map((item) => (
              <Row key={item.id} onClick={() => setEditing(item)}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{item.food.name}</span>
                  {item.food.brand ? (
                    <span className="block truncate text-sm text-ink-muted">{item.food.brand}</span>
                  ) : null}
                </span>
                <span className="shrink-0 font-mono text-2xs tabular-nums text-ink-faint">
                  {formatNumber(item.quantityG, locale, 0)} g
                </span>
              </Row>
            ))}
          </Rows>
        )}

        <Button asChild variant="tinted" className="mt-4 w-full">
          <Link to={`/food/add?recipe=${recipe.id}&date=${date}`}>{t('pages.recipes.addIngredient')}</Link>
        </Button>
      </section>

      <Button
        variant="quiet"
        className="mt-8 text-danger hover:border-danger"
        onClick={() => void deleteRecipe()}
      >
        {t('pages.recipes.delete')}
      </Button>

      <Link
        to={`/food/recipes?date=${date}`}
        className="mt-8 flex min-h-11 items-center font-mono text-2xs text-accent underline decoration-1 underline-offset-2"
      >
        ← {t('pages.recipes.back')}
      </Link>

      {/* Keyed on what is open, so every opening starts from the saved amount
          rather than from whatever was typed and dismissed last time. */}
      <ItemSheet
        key={editing?.id ?? 'closed'}
        item={editing}
        onClose={() => setEditing(null)}
        onSave={async (quantityG) => {
          const item = editing
          setEditing(null)
          if (item && !(await updateItem(item.id, quantityG))) toast(t('pages.recipes.saveFailed'))
        }}
        onRemove={() => {
          if (editing) void removeIngredient(editing)
          setEditing(null)
        }}
      />
    </>
  )
}

/** One ingredient's amount, or its removal. */
function ItemSheet({
  item,
  onClose,
  onSave,
  onRemove,
}: {
  item: RecipeItem | null
  onClose: () => void
  onSave: (quantityG: number) => void
  onRemove: () => void
}) {
  const { t, i18n } = useTranslation()
  const [value, setValue] = useState(() =>
    item ? formatForInput(item.quantityG, i18n.language, QUANTITY_LIMITS.decimals) : '',
  )
  const [error, setError] = useState(false)

  return (
    <Sheet open={item !== null} onOpenChange={(open) => !open && onClose()} title={item?.food.name ?? ''} closeLabel={t('common.close')}>
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          const parsed = parseDecimalInput(value, QUANTITY_LIMITS)
          if (parsed === null) return setError(true)
          onSave(parsed)
        }}
      >
        <NumberField
          id="recipe-item-quantity"
          label={t('pages.food.portion.quantity')}
          unit="g"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          error={error ? t('pages.food.portion.quantityInvalid') : undefined}
        />
        <Button type="submit" variant="primary">
          {t('pages.recipes.saveItem')}
        </Button>
        <Button type="button" variant="quiet" className="text-danger hover:border-danger" onClick={onRemove}>
          {t('pages.recipes.removeItem')}
        </Button>
      </form>
    </Sheet>
  )
}

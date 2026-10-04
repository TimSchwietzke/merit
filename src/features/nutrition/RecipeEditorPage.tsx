import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { EmptyState } from '@/components/EmptyState'
import { NumberField } from '@/components/NumberField'
import { PageHeader } from '@/components/PageHeader'
import { Row, Rows } from '@/components/Rows'
import { SectionHead } from '@/components/SectionHead'
import { Button } from '@/components/ui/button'
import { Confirm } from '@/components/ui/confirm'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet } from '@/components/ui/sheet'
import { useRecipes, type Recipe, type RecipeItem } from '@/features/nutrition/useRecipes'
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
  updateItem,
  removeItem,
}: { recipe: Recipe } & Pick<ReturnType<typeof useRecipes>, 'update' | 'remove' | 'updateItem' | 'removeItem'>) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [name, setName] = useState(recipe.name)
  const [total, setTotal] = useState(
    recipe.totalG === null ? '' : formatForInput(recipe.totalG, locale, TOTAL_LIMITS.decimals),
  )
  const [totalError, setTotalError] = useState(false)
  const [editing, setEditing] = useState<RecipeItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function saved(ok: Promise<boolean>) {
    if (!(await ok)) toast(t('pages.recipes.saveFailed'))
  }

  function saveName() {
    const trimmed = name.trim()
    if (!trimmed) return setName(recipe.name)
    if (trimmed !== recipe.name) void saved(update(recipe.id, { name: trimmed }))
  }

  function saveTotal() {
    if (total.trim() === '') {
      setTotalError(false)
      if (recipe.totalG !== null) void saved(update(recipe.id, { totalG: null }))
      return
    }
    const parsed = parseDecimalInput(total, TOTAL_LIMITS)
    setTotalError(parsed === null)
    if (parsed !== null && parsed !== recipe.totalG) void saved(update(recipe.id, { totalG: parsed }))
  }

  return (
    <>
      <PageHeader title={recipe.name} />

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
            onBlur={saveName}
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
          onBlur={saveTotal}
          onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
          error={totalError ? t('pages.recipes.portion.invalid') : undefined}
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
          <Link to={`/food/add?recipe=${recipe.id}`}>{t('pages.recipes.addIngredient')}</Link>
        </Button>
      </section>

      <Button
        variant="quiet"
        className="mt-8 text-danger hover:border-danger"
        onClick={() => setDeleting(true)}
      >
        {t('pages.recipes.delete')}
      </Button>

      <Link
        to="/food/recipes"
        className="mt-8 flex min-h-11 items-center font-mono text-2xs text-accent underline decoration-1 underline-offset-2"
      >
        ← {t('pages.recipes.back')}
      </Link>

      <ItemSheet
        item={editing}
        onClose={() => setEditing(null)}
        onSave={(quantityG) => {
          if (editing) void saved(updateItem(editing.id, quantityG))
          setEditing(null)
        }}
        onRemove={() => {
          if (editing) void saved(removeItem(editing.id))
          setEditing(null)
        }}
      />

      {/* Asked first: a recipe is typed in once and has no undo here. */}
      <Confirm
        open={deleting}
        onOpenChange={setDeleting}
        question={t('pages.recipes.deleteTitle')}
        confirmLabel={t('pages.recipes.delete')}
        cancelLabel={t('common.cancel')}
        onConfirm={async () => {
          if (await remove(recipe.id)) navigate('/food/recipes')
          else toast(t('pages.recipes.saveFailed'))
        }}
      >
        <p className="text-sm text-ink-muted">{t('pages.recipes.deleteBody')}</p>
      </Confirm>
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
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)
  const [shown, setShown] = useState<string | null>(null)

  // A different ingredient opened: start from its amount.
  if (item && shown !== item.id) {
    setShown(item.id)
    setValue(formatForInput(item.quantityG, i18n.language, QUANTITY_LIMITS.decimals))
    setError(false)
  }

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

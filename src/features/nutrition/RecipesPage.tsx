import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { EmptyState } from '@/components/EmptyState'
import { FloatingAdd } from '@/components/FloatingAdd'
import { PageHeader } from '@/components/PageHeader'
import { Row, Rows } from '@/components/Rows'
import { Loading, RowsSkeleton } from '@/components/Skeleton'
import { useRecipes } from '@/features/nutrition/useRecipes'
import { todayKey } from '@/lib/date'
import { formatNumber } from '@/lib/format'

/** Every recipe, and the way to a new one. */
export default function RecipesPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const navigate = useNavigate()
  const { recipes, status, create } = useRecipes()
  // The way here is from add-food for a day; the way back keeps that day.
  const [params] = useSearchParams()
  const date = params.get('date') ?? todayKey()

  // Like a new routine: the row exists at once with a working name, and the
  // editor it opens on is where it gets its real one.
  async function addRecipe() {
    const id = await create(t('pages.recipes.defaultName'))
    if (id) navigate(`/food/recipes/${id}?new=1&date=${date}`)
    else toast(t('pages.recipes.createFailed'))
  }

  return (
    <>
      <PageHeader title={t('pages.recipes.title')} />

      <section className="pb-16">
        {status === 'loading' ? (
          <Loading label={t('common.loading')}>
            <RowsSkeleton rows={3} />
          </Loading>
        ) : status === 'error' ? (
          <p role="alert" className="text-sm text-danger">
            {t('pages.recipes.loadFailed')}
          </p>
        ) : recipes.length === 0 ? (
          <EmptyState>{t('pages.recipes.empty')}</EmptyState>
        ) : (
          <Rows>
            {recipes.map((recipe) => (
              <Row key={recipe.id} to={`/food/recipes/${recipe.id}?date=${date}`}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{recipe.name}</span>
                  <span className="block truncate font-mono text-2xs text-ink-faint">
                    {t('pages.recipes.ingredients', { count: recipe.items.length })}
                    {recipe.totalG !== null ? ` · ${formatNumber(recipe.totalG, locale, 0)} g` : ''}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-2xs tabular-nums text-ink-faint">
                  {formatNumber(recipe.totals.kcal.value, locale, 0)} kcal
                </span>
              </Row>
            ))}
          </Rows>
        )}
      </section>

      <Link
        to={`/food/add?date=${date}`}
        className="mt-8 inline-flex min-h-11 items-center font-mono text-2xs text-accent underline decoration-1 underline-offset-2"
      >
        ← {t('pages.food.add.backToSearch')}
      </Link>

      <FloatingAdd label={t('pages.recipes.create')} onClick={addRecipe} />
    </>
  )
}

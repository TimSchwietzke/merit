import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { PageHeader } from '@/components/PageHeader'
import { Row, Rows } from '@/components/Rows'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NewFoodForm, type NewFood } from '@/features/nutrition/NewFoodForm'
import { PortionForm } from '@/features/nutrition/PortionForm'
import { useFoodLog } from '@/features/nutrition/useFoodLog'
import { useFoodSearch, type CatalogueFood } from '@/features/nutrition/useFoodSearch'
import { useSession } from '@/features/auth/useSession'
import { todayKey } from '@/lib/date'
import { formatNumber } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import type { MealType } from '@/lib/nutrition'

/**
 * Adding a food, as one screen with three states: search the catalogue, add a
 * food the catalogue does not have, then say how much of it.
 *
 * A screen rather than a sheet. The keyboard is open for most of this flow and
 * a bottom sheet fights it (§8); a route also means the back button does what
 * it looks like it does, and the day underneath is not holding scroll position
 * behind a scrim.
 *
 * The lookup order this implements is steps one and four of GOAL.md §4 — our
 * own database, then manual entry. Open Food Facts and the USDA proxy are steps
 * two and three and slot in between, at the point where the search comes back
 * with nothing.
 */
export default function AddFoodPage() {
  const { t } = useTranslation()
  const { i18n } = useTranslation()
  const locale = i18n.language
  const navigate = useNavigate()
  const { session } = useSession()

  const [params] = useSearchParams()
  const date = params.get('date') ?? todayKey()
  const meal = (params.get('meal') as MealType | null) ?? undefined

  const [query, setQuery] = useState('')
  const { results, status } = useFoodSearch(query)

  const [picked, setPicked] = useState<CatalogueFood | null>(null)
  const [creating, setCreating] = useState(false)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  const { add } = useFoodLog(date)

  async function logPortion({ quantityG, mealType }: { quantityG: number; mealType: MealType }) {
    if (!picked) return
    setPending(true)
    setFailed(false)
    const saved = await add({ foodId: picked.id, mealType, quantityG })
    setPending(false)
    if (saved) navigate(`/food?date=${date}`)
    else setFailed(true)
  }

  async function createFood(food: NewFood) {
    if (!session) return
    setPending(true)
    setFailed(false)

    const { data, error } = await supabase
      .from('foods')
      .insert({
        name: food.name,
        brand: food.brand,
        kcal_100g: food.values.kcal ?? 0,
        fat_100g: food.values.fat ?? 0,
        carbs_100g: food.values.carbs ?? 0,
        protein_100g: food.values.protein ?? 0,
        saturated_fat_100g: food.values.saturatedFat,
        sugars_100g: food.values.sugars,
        fibre_100g: food.values.fibre,
        salt_100g: food.values.salt,
        // Typed in by a person, so it is a community entry whatever it
        // describes — the chip on a search result says so (GOAL.md §4).
        source: 'community',
        created_by: session.user.id,
      })
      .select('id, name, brand, source, serving_size_g, serving_label')
      .single()

    setPending(false)
    if (!data || error) {
      setFailed(true)
      return
    }

    // Straight on to the quantity: the food was added in order to log it.
    setPicked({
      id: data.id,
      name: data.name,
      brand: data.brand,
      source: data.source,
      servingSizeG: data.serving_size_g,
      servingLabel: data.serving_label,
      nutrients: {
        kcal: food.values.kcal ?? 0,
        fat: food.values.fat ?? 0,
        carbs: food.values.carbs ?? 0,
        protein: food.values.protein ?? 0,
        saturatedFat: food.values.saturatedFat,
        sugars: food.values.sugars,
        fibre: food.values.fibre,
        salt: food.values.salt,
      },
    })
    setCreating(false)
  }

  if (picked) {
    return (
      <>
        <PageHeader title={t('pages.food.add.title')} />
        <PortionForm
          food={picked}
          mealType={meal}
          pending={pending}
          failed={failed}
          submitLabel={pending ? t('pages.food.portion.saving') : t('pages.food.portion.save')}
          onSubmit={logPortion}
        />
        <Button variant="bare" className="mt-4" onClick={() => setPicked(null)}>
          ← {t('pages.food.add.search')}
        </Button>
      </>
    )
  }

  if (creating) {
    return (
      <>
        <PageHeader title={t('pages.food.new.title')} />
        <NewFoodForm pending={pending} failed={failed} onSubmit={createFood} />
        <Button variant="bare" className="mt-4" onClick={() => setCreating(false)}>
          ← {t('pages.food.add.search')}
        </Button>
      </>
    )
  }

  return (
    <>
      <PageHeader title={t('pages.food.add.title')} lead={t('pages.food.add.lead')} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="food-search">
          {t('pages.food.add.search')}
          <span className="text-ink-faint">{t('pages.food.add.searchHint')}</span>
        </Label>
        <Input
          id="food-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
        />
      </div>

      <section className="mt-6">
        {status === 'searching' ? (
          <p className="font-mono text-2xs text-ink-faint">{t('pages.food.add.searching')}</p>
        ) : null}

        {status === 'error' ? (
          <p role="alert" className="text-sm text-danger">
            {t('pages.food.add.searchFailed')}
          </p>
        ) : null}

        {status === 'ready' && results.length > 0 ? (
          <Rows>
            {results.map((food) => (
              <Row key={food.id} onClick={() => setPicked(food)}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{food.name}</span>
                  {food.brand ? (
                    <span className="block truncate text-sm text-ink-muted">{food.brand}</span>
                  ) : null}
                </span>
                <span className="shrink-0 font-mono text-2xs tabular-nums text-ink-faint">
                  {formatNumber(food.nutrients.kcal, locale, 0)} kcal / 100 g
                </span>
              </Row>
            ))}
          </Rows>
        ) : null}

        {/* The most important empty state in the app: it is the path by which
            the shared catalogue grows (§10.8). The next step is offered in
            place, not on another screen. */}
        {(status === 'ready' && results.length === 0) || status === 'idle' ? (
          <div className="rounded-lg border border-line bg-surface px-4 py-6 text-center">
            {status === 'ready' ? (
              <p className="text-sm text-ink-muted">{t('pages.food.add.noResults')}</p>
            ) : null}
            <Button
              variant="tinted"
              className={status === 'ready' ? 'mt-4' : ''}
              onClick={() => setCreating(true)}
            >
              {t('pages.food.add.addYourself')}
            </Button>
          </div>
        ) : null}
      </section>

      <Link
        to={`/food?date=${date}`}
        className="mt-8 inline-flex min-h-11 items-center font-mono text-2xs text-accent underline decoration-1 underline-offset-2"
      >
        ← {t('pages.food.add.back')}
      </Link>
    </>
  )
}

import { lazy, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { PageHeader } from '@/components/PageHeader'
import { Row, Rows } from '@/components/Rows'
import { Collapsible } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NewFoodForm, type NewFood } from '@/features/nutrition/NewFoodForm'
import { resolveBarcode } from '@/features/nutrition/resolve-barcode'
import { resolveUsdaFood } from '@/features/nutrition/resolve-usda'
import { PortionForm } from '@/features/nutrition/PortionForm'
import { useFoodLog } from '@/features/nutrition/useFoodLog'
import { useFoodSearch } from '@/features/nutrition/useFoodSearch'
import { type CatalogueFood } from '@/features/nutrition/catalogue'
import { useRecentFoods } from '@/features/nutrition/useRecentFoods'
import { useSession } from '@/features/auth/useSession'
import { todayKey } from '@/lib/date'
import { formatNumber } from '@/lib/format'
import { ATTRIBUTION_URL } from '@/lib/off'
import { supabase } from '@/lib/supabase'
import type { MealType } from '@/lib/nutrition'
import type { UsdaFood } from '@/lib/usda'

/**
 * Adding a food, as one screen with three states: search the catalogue, add a
 * food the catalogue does not have, then say how much of it.
 *
 * A screen rather than a sheet. The keyboard is open for most of this flow and
 * a bottom sheet fights it (§8); a route also means the back button does what
 * it looks like it does, and the day underneath is not holding scroll position
 * behind a scrim.
 *
 * The lookup order is GOAL.md §4: Merit's own catalogue, then Open Food Facts
 * by barcode, then USDA by name for the whole foods nobody scans, then typing
 * it in. Each step is a group on this screen rather than a screen of its own,
 * so a search that only USDA can answer still ends in the same tap.
 */
/**
 * The decoder is a third of the bundle gzipped and only this one state needs
 * it, so it is fetched when somebody opens the scanner rather than by everyone
 * on every page load.
 */
const BarcodeScanner = lazy(() =>
  import('@/features/nutrition/BarcodeScanner').then((m) => ({ default: m.BarcodeScanner })),
)

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
  const { results, status, usda, remoteStatus } = useFoodSearch(query)
  const recent = useRecentFoods()
  const [folded, setFolded] = useState<Set<string>>(new Set())

  function fold(key: string, open: boolean) {
    setFolded((current) => {
      const next = new Set(current)
      if (open) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const [picked, setPicked] = useState<CatalogueFood | null>(null)
  const [creating, setCreating] = useState(false)
  const [scanning, setScanning] = useState(params.get('scan') === '1')
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const [scanResult, setScanResult] = useState<'missing' | 'offline' | null>(null)
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null)

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

  async function onCode(code: string) {
    if (!session || pending) return
    setPending(true)
    setScanResult(null)

    const resolved = await resolveBarcode(code, session.user.id)
    setPending(false)

    if (resolved.kind === 'found') {
      setScanning(false)
      setPicked(resolved.food)
      return
    }
    // Not an error dialog: a barcode that did not resolve is an empty state,
    // and the next step is offered in place (§10.8, §14).
    setScanResult(resolved.kind)
    if (resolved.kind === 'missing') setScannedBarcode(resolved.barcode)
  }

  async function pickUsda(food: UsdaFood) {
    if (!session || pending) return
    setPending(true)
    setFailed(false)

    const cached = await resolveUsdaFood(food, session.user.id)
    setPending(false)
    if (cached) setPicked(cached)
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
        // Carried over when the food is being added because a scan found
        // nothing: the next person to scan it then gets a hit (GOAL.md §4).
        barcode: scannedBarcode,
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
      fdcId: null,
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

  if (scanning) {
    return (
      <>
        <PageHeader title={t('pages.food.scan.title')} />
        <Suspense
          fallback={<p className="font-mono text-2xs text-ink-faint">{t('common.loading')}</p>}
        >
          <BarcodeScanner onCode={onCode} busy={pending} />
        </Suspense>

        {scanResult ? (
          <div className="mt-6 rounded-lg border border-line bg-surface px-4 py-6 text-center">
            <p className="text-sm text-ink-muted">{t(`pages.food.scan.${scanResult}`)}</p>
            {scanResult === 'missing' ? (
              <Button
                variant="tinted"
                className="mt-4"
                onClick={() => {
                  setScanning(false)
                  setCreating(true)
                }}
              >
                {t('pages.food.scan.addYourself')}
              </Button>
            ) : null}
          </div>
        ) : null}

        <Attribution />

        <Button variant="bare" className="mt-4" onClick={() => setScanning(false)}>
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

      {/* The fastest path to a packaged product, so it is not buried under the
          search results (GOAL.md §5: repeating a log must be one tap). */}
      <Button variant="tinted" className="mt-4 w-full md:w-auto" onClick={() => setScanning(true)}>
        {t('pages.food.scan.open')}
      </Button>

      <section className="mt-6">
        {/* First among the results and narrowed by nothing (§10.11). GOAL.md §5
            calls repeating a previous meal the feature that decides whether the
            app gets used daily. */}
        {recent.length > 0 ? (
          <Collapsible
            label={t('pages.food.add.recent')}
            count={recent.length}
            open={!folded.has('recent')}
            onOpenChange={(open) => fold('recent', open)}
          >
            <FoodRows
              foods={recent.map(({ food }) => ({
                key: food.id,
                name: food.name,
                brand: food.brand,
                kcal: food.nutrients.kcal,
                pick: () => setPicked(food),
              }))}
              locale={locale}
            />
          </Collapsible>
        ) : null}

        {status === 'searching' ? (
          <p className="font-mono text-2xs text-ink-faint">{t('pages.food.add.searching')}</p>
        ) : null}

        {status === 'error' ? (
          <p role="alert" className="text-sm text-danger">
            {t('pages.food.add.searchFailed')}
          </p>
        ) : null}

        {status === 'ready' && results.length > 0 ? (
          <Collapsible
            label={t('pages.food.add.catalogue')}
            count={results.length}
            open={!folded.has('catalogue')}
            onOpenChange={(open) => fold('catalogue', open)}
          >
            <FoodRows
              foods={results.map((food) => ({
                key: food.id,
                name: food.name,
                brand: food.brand,
                kcal: food.nutrients.kcal,
                pick: () => setPicked(food),
              }))}
              locale={locale}
            />
          </Collapsible>
        ) : null}

        {/* USDA under the catalogue, because the catalogue answers instantly
            and this is a round trip. A result here is not a row yet: picking
            one writes it into the shared catalogue first (GOAL.md §4). */}
        {remoteStatus === 'searching' && status === 'ready' ? (
          <p className="mt-4 font-mono text-2xs text-ink-faint">
            {t('pages.food.add.searchingUsda')}
          </p>
        ) : null}

        {usda.length > 0 ? (
          <div className="mt-4">
            <Collapsible
              label={t('pages.food.add.usda')}
              count={usda.length}
              open={!folded.has('usda')}
              onOpenChange={(open) => fold('usda', open)}
            >
              <FoodRows
                foods={usda.map((food) => ({
                  key: String(food.fdcId),
                  name: food.name,
                  brand: null,
                  kcal: food.nutrients.kcal,
                  pick: () => void pickUsda(food),
                }))}
                locale={locale}
              />
            </Collapsible>
          </div>
        ) : null}

        {/* Silent when the proxy has no key: that is a deployment that has not
            been finished, and there is nothing the reader could do about it. */}
        {remoteStatus === 'error' || remoteStatus === 'rateLimited' ? (
          <p className="mt-4 font-mono text-2xs text-ink-faint">
            {t(`pages.food.add.usda${remoteStatus === 'rateLimited' ? 'Busy' : 'Failed'}`)}
          </p>
        ) : null}

        {/* The most important empty state in the app: it is the path by which
            the shared catalogue grows (§10.8). The next step is offered in
            place, not on another screen. */}
        {(status === 'ready' &&
          results.length === 0 &&
          usda.length === 0 &&
          remoteStatus !== 'searching') ||
        status === 'idle' ? (
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

      <Attribution />

      <Link
        to={`/food?date=${date}`}
        className="mt-8 inline-flex min-h-11 items-center font-mono text-2xs text-accent underline decoration-1 underline-offset-2"
      >
        ← {t('pages.food.add.back')}
      </Link>
    </>
  )
}

/**
 * Open Food Facts is ODbL, which requires the source to be named and linked
 * wherever its data is shown (GOAL.md §4, §8). One quiet mono line.
 */
function Attribution() {
  const { t } = useTranslation()
  return (
    <p className="mt-8 font-mono text-2xs text-ink-faint">
      {t('pages.food.scan.attribution')}{' '}
      {/* `inline-flex min-h-11` per §5.2: the hit area grows to 44px, the text
          and its underline stay exactly where they were. */}
      <a
        href={ATTRIBUTION_URL}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-11 items-center text-accent underline decoration-1 underline-offset-2"
      >
        {ATTRIBUTION_URL.replace('https://', '')}
      </a>
    </p>
  )
}

/**
 * The row a food gets in any of the three groups. The catalogue has rows with
 * ids and USDA has results that are not rows yet, so what they have in common
 * is passed in rather than the shape they do not share.
 */
interface Pickable {
  key: string
  name: string
  brand: string | null
  kcal: number
  pick: () => void
}

function FoodRows({ foods, locale }: { foods: Pickable[]; locale: string }) {
  return (
    <Rows>
      {foods.map((food) => (
        <Row key={food.key} onClick={food.pick}>
          <span className="min-w-0 flex-1">
            <span className="block truncate">{food.name}</span>
            {food.brand ? (
              <span className="block truncate text-sm text-ink-muted">{food.brand}</span>
            ) : null}
          </span>
          <span className="shrink-0 font-mono text-2xs tabular-nums text-ink-faint">
            {formatNumber(food.kcal, locale, 0)} kcal / 100 g
          </span>
        </Row>
      ))}
    </Rows>
  )
}

import { ScanBarcode } from 'lucide-react'
import { lazy, Suspense, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { PageHeader } from '@/components/PageHeader'
import { Row, Rows } from '@/components/Rows'
import { SectionHead } from '@/components/SectionHead'
import { Collapsible } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NewFoodForm, type NewFood } from '@/features/nutrition/NewFoodForm'
import { resolveBarcode } from '@/features/nutrition/resolve-barcode'
import { cacheOffFood } from '@/features/nutrition/resolve-barcode'
import { resolveUsdaFood } from '@/features/nutrition/resolve-usda'
import { PortionForm } from '@/features/nutrition/PortionForm'
import { useFoodLog } from '@/features/nutrition/useFoodLog'
import { useFoodSearch } from '@/features/nutrition/useFoodSearch'
import {
  FOOD_SELECT,
  toCatalogueFood,
  type CatalogueFood,
  type FoodRow,
} from '@/features/nutrition/catalogue'
import { useRecentFoods } from '@/features/nutrition/useRecentFoods'
import { useSession } from '@/features/auth/useSession'
import { todayKey } from '@/lib/date'
import { formatNumber } from '@/lib/format'
import { ATTRIBUTION_URL, type OffFood } from '@/lib/off'
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
  // What was typed, and what was asked. A search happens because somebody
  // asked for one: it is one press rather than one per keystroke, which is
  // what makes it affordable to ask Open Food Facts every time (ten searches a
  // minute for the whole project) and what makes the screen quiet until there
  // is something to say.
  const [term, setTerm] = useState('')
  const { results, status, usda, usdaStatus, off, offStatus } = useFoodSearch(term)
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

  async function pickOff(food: OffFood) {
    if (!session || pending) return
    setPending(true)
    setFailed(false)

    const cached = await cacheOffFood(food, session.user.id)
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
        // describes. The chip on a search result says so (GOAL.md §4).
        source: 'community',
        created_by: session.user.id,
      })
      .select(FOOD_SELECT)
      .single()

    setPending(false)
    if (!data || error) {
      setFailed(true)
      return
    }

    // Straight on to the quantity: the food was added in order to log it.
    setPicked(toCatalogueFood(data as FoodRow))
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

  const asked = term.length > 0
  const searching =
    status === 'searching' || usdaStatus === 'searching' || offStatus === 'searching'
  const nothing =
    asked && !searching && results.length === 0 && usda.length === 0 && off.length === 0

  function search(event: FormEvent) {
    event.preventDefault()
    setTerm(query.trim())
  }

  return (
    <>
      {/* No lead. The screen is a search field with its own label, and a
          paragraph naming the databases behind it is a paragraph nobody reads
          twice (§14, and the wording pass on docs/TODO.md). */}
      <PageHeader title={t('pages.food.add.title')} />

      {/* A form, so the keyboard's own go key does what the button does. */}
      <form onSubmit={search} className="flex flex-col gap-2">
        <Label htmlFor="food-search">
          {t('pages.food.add.search')}
          <span className="text-ink-faint">{t('pages.food.add.searchHint')}</span>
        </Label>

        <div className="flex items-start gap-2">
          <Input
            id="food-search"
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              // Emptying the field puts the screen back where it started,
              // rather than leaving results under a search that is no longer
              // written anywhere.
              if (event.target.value.trim() === '') setTerm('')
            }}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="min-w-0 flex-1"
          />
          <Button type="submit" variant="primary" className="shrink-0" disabled={searching}>
            {t(searching ? 'pages.food.add.searching' : 'pages.food.add.go')}
          </Button>
        </div>
      </form>

      {/* The other way of asking the same question, and the fastest one for a
          packet. Under the field rather than beside it: three controls on one
          row at 375px is a row nobody can hit (§5.2). */}
      <Button variant="tinted" className="mt-3 w-full" onClick={() => setScanning(true)}>
        <ScanBarcode aria-hidden />
        {t('pages.food.scan.open')}
      </Button>

      <section className="mt-8">
        {/* Before a search, the screen is the list of things logged lately.
            GOAL.md §5 calls repeating a previous meal the feature that decides
            whether the app gets used daily, and §10.11 puts it first.

            After a search it goes: what was asked for is what the screen is
            about, and every one of these rows is in the catalogue anyway, so
            the results hold whichever of them matched. */}
        {!asked && recent.length > 0 ? (
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

        {searching ? (
          <p className="font-mono text-2xs text-ink-faint">{t('pages.food.add.searching')}</p>
        ) : null}

        {status === 'error' ? (
          <p role="alert" className="text-sm text-danger">
            {t('pages.food.add.searchFailed')}
          </p>
        ) : null}

        {results.length > 0 ? (
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

        {/* The outside services under the catalogue, which answers instantly
            while they are round trips. A row here is not in the catalogue yet:
            picking one writes it there first (GOAL.md §4). */}
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

        {off.length > 0 ? (
          <div className="mt-4">
            <Collapsible
              label={t('pages.food.add.off')}
              count={off.length}
              open={!folded.has('off')}
              onOpenChange={(open) => fold('off', open)}
            >
              <FoodRows
                foods={off.map((food) => ({
                  key: food.barcode,
                  name: food.name,
                  brand: food.brand,
                  kcal: food.nutrients.kcal,
                  pick: () => void pickOff(food),
                }))}
                locale={locale}
              />
            </Collapsible>
          </div>
        ) : null}

        {nothing ? (
          <p className="font-mono text-2xs text-ink-faint">{t('pages.food.add.noResults')}</p>
        ) : null}

        {/* One line, and only when a service actually failed. A search that
            found nothing has already said so above; a service that was not
            reachable is a different fact and the reason a result might be
            missing. Nothing is said about a proxy without its key: that is a
            deployment nobody reading this screen can finish. */}
        {asked && !searching && (usdaStatus === 'error' || usdaStatus === 'rateLimited') ? (
          <p className="mt-3 font-mono text-2xs text-ink-faint">
            {t(`pages.food.add.usda${usdaStatus === 'rateLimited' ? 'Busy' : 'Failed'}`)}
          </p>
        ) : null}

        {asked && !searching && (offStatus === 'error' || offStatus === 'rateLimited') ? (
          <p className="mt-3 font-mono text-2xs text-ink-faint">
            {t(offStatus === 'rateLimited' ? 'pages.food.add.offBusy' : 'pages.food.add.offFailed')}
          </p>
        ) : null}
      </section>

      {/* Only once a search has been run. Before that there is nothing it could
          not fit, and a screen that opens by offering to give up is a screen
          that has already given up. It stays for a search that found things
          too: finding four pastas is not the same as finding yours. */}
      {asked && !searching ? (
        <section className="mt-8">
          <SectionHead label={t('pages.food.add.elsewhere')} />
          <Rows>
            <Row onClick={() => setCreating(true)}>
              <span className="min-w-0 flex-1">{t('pages.food.add.addYourself')}</span>
              <span aria-hidden className="shrink-0 font-mono text-2xs text-ink-faint">
                →
              </span>
            </Row>
          </Rows>
        </section>
      ) : null}

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

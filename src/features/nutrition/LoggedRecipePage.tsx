import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { PageHeader } from '@/components/PageHeader'
import { Panel } from '@/components/Panel'
import { Row, Rows } from '@/components/Rows'
import { SectionHead } from '@/components/SectionHead'
import { Value } from '@/components/Value'
import { Button } from '@/components/ui/button'
import { RecipePortionForm } from '@/features/nutrition/RecipePortionForm'
import { useFoodLog } from '@/features/nutrition/useFoodLog'
import { wholeOf } from '@/features/nutrition/useRecipes'
import { todayKey } from '@/lib/date'
import { formatNumber } from '@/lib/format'
import { sumPortions } from '@/lib/nutrition'

/**
 * A logged recipe: its portion and meal, and the ingredients under it. The
 * counterpart of a single entry's screen, for a line that stands for a meal.
 */
export default function LoggedRecipePage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const date = params.get('date') ?? todayKey()
  const day = `/food?date=${date}`

  const { entries, status, updateGroup, removeGroup, restoreGroup } = useFoodLog(date)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [removeFailed, setRemoveFailed] = useState(false)

  const rows = entries.filter((entry) => entry.group?.id === id)
  const group = rows[0]?.group

  // Gone, removed here or on another device: nothing to show.
  useEffect(() => {
    if (status === 'ready' && !group) navigate(day, { replace: true })
  }, [status, group, navigate, day])

  if (!group) {
    return (
      <p className="font-mono text-2xs text-ink-faint">
        {t(status === 'error' ? 'pages.food.loadFailed' : 'common.loading')}
      </p>
    )
  }

  // The form previews shares of the whole recipe, from each row's unrounded
  // amount in it (falling back to the portion scaled up, for a row without one).
  const whole = wholeOf(
    sumPortions(
      rows.map((row) => ({
        nutrients: row.food.nutrients,
        quantityG: row.recipeG ?? row.quantityG / group.factor,
      })),
    ),
  )

  async function save({ mealType, share }: { mealType: Parameters<typeof updateGroup>[2]; share: number }) {
    if (!group) return
    setPending(true)
    setFailed(false)
    const saved = await updateGroup(group.id, share, mealType)
    setPending(false)
    if (saved) navigate(day)
    else setFailed(true)
  }

  async function onRemove() {
    if (!group || removing) return
    setRemoving(true)
    setRemoveFailed(false)
    const removed = await removeGroup(group.id)
    setRemoving(false)
    if (!removed) return setRemoveFailed(true)
    navigate(day)
    toast(t('pages.recipes.lineRemoved', { name: group.name }), {
      action: {
        label: t('common.undo'),
        onClick: () =>
          void restoreGroup(rows).then((ok) => {
            if (!ok) toast(t('pages.recipes.undoFailed', { name: group.name }))
          }),
      },
    })
  }

  return (
    <>
      <PageHeader title={group.name} />

      <Panel className="p-4">
        <RecipePortionForm
          whole={whole}
          share={group.factor}
          mealType={rows[0].mealType}
          pending={pending}
          failed={failed}
          submitLabel={t(pending ? 'pages.food.entry.saving' : 'pages.food.entry.save')}
          onSubmit={save}
        />
      </Panel>

      <section className="mt-8">
        <SectionHead label={t('pages.recipes.ingredientsLabel')} />
        <Rows>
          {rows.map((row) => (
            <Row key={row.id} to={`/food/entry/${row.id}?date=${date}`}>
              <span className="min-w-0 flex-1 truncate">{row.food.name}</span>
              <span className="shrink-0 font-mono text-2xs tabular-nums text-ink-faint">
                {formatNumber(row.quantityG, locale, 0)} g
              </span>
              <span className="shrink-0">
                <Value n={formatNumber((row.food.nutrients.kcal * row.quantityG) / 100, locale, 0)} unit="kcal" />
              </span>
            </Row>
          ))}
        </Rows>
      </section>

      {/* Undoable, so it does not ask first (§14). */}
      <Button
        variant="quiet"
        className="mt-8 text-danger hover:border-danger"
        pending={removing}
        onClick={() => void onRemove()}
      >
        {t('pages.food.entry.delete')}
      </Button>
      {removeFailed ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {t('pages.recipes.removeFailed')}
        </p>
      ) : null}

      <Link
        to={day}
        className="mt-8 flex min-h-11 items-center font-mono text-2xs text-accent underline decoration-1 underline-offset-2"
      >
        ← {t('pages.food.add.back')}
      </Link>
    </>
  )
}

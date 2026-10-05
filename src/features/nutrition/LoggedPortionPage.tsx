import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { PortionForm } from '@/features/nutrition/PortionForm'
import { useFoodLog, type LoggedFood } from '@/features/nutrition/useFoodLog'
import { todayKey } from '@/lib/date'
import { formatForInput } from '@/lib/format'
import { QUANTITY_LIMITS, type MealType } from '@/lib/nutrition'

/**
 * One logged portion: change how much, or which meal it belongs to.
 *
 * Reached by tapping the row, which is the non-destructive thing a tap should
 * do. It is also where a keyboard or screen-reader user deletes, since the
 * swipe on the day view is a gesture they cannot perform (§10.1).
 */
export default function LoggedPortionPage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const date = params.get('date') ?? todayKey()

  const { entries, status, update, remove, restore } = useFoodLog(date)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  const entry: LoggedFood | undefined = entries.find((row) => row.id === id)
  // An ingredient was opened from its recipe line, and goes back there.
  const back = entry?.group ? `/food/meal/${entry.group.id}?date=${date}` : `/food?date=${date}`

  // The row can be gone, deleted here, or on another device. Nothing to edit
  // then, and no reason to sit on a dead screen.
  useEffect(() => {
    if (status === 'ready' && !entry) navigate(`/food?date=${date}`, { replace: true })
  }, [status, entry, navigate, date])

  if (!entry) {
    return (
      <p className="font-mono text-2xs text-ink-faint">
        {t(status === 'error' ? 'pages.food.loadFailed' : 'common.loading')}
      </p>
    )
  }

  async function save({ quantityG, mealType }: { quantityG: number; mealType: MealType }) {
    if (!id) return
    setPending(true)
    setFailed(false)
    const saved = await update(id, { quantityG, mealType })
    setPending(false)
    if (saved) navigate(back)
    else setFailed(true)
  }

  async function onDelete() {
    if (!id) return
    setPending(true)
    setFailed(false)
    const removed = await remove(id)
    setPending(false)
    if (!removed || !entry) return setFailed(true)
    navigate(back)
    // The undo the button's comment promises (§14), as the day's swipe has.
    toast(t('pages.food.deleted', { name: entry.food.name }), {
      action: {
        label: t('common.undo'),
        onClick: () =>
          void restore(entry).then((ok) => {
            if (!ok) toast(t('pages.food.undoFailed'))
          }),
      },
    })
  }

  return (
    <>
      <PageHeader title={t('pages.food.entry.title')} />

      <PortionForm
        food={entry.food}
        quantityG={formatForInput(entry.quantityG, i18n.language, QUANTITY_LIMITS.decimals)}
        mealType={entry.mealType}
        // An ingredient stays with its recipe line, so only its amount changes.
        withMeal={!entry.group}
        pending={pending}
        failed={failed}
        submitLabel={pending ? t('pages.food.entry.saving') : t('pages.food.entry.save')}
        onSubmit={save}
      />

      {/* Undoable, so it does not ask first (§14). The danger colour is one
          class on the quiet variant rather than a fifth button kind. */}
      <Button
        variant="quiet"
        className="mt-4 text-danger hover:border-danger"
        pending={pending}
        onClick={onDelete}
      >
        {t('pages.food.entry.delete')}
      </Button>

      <Link
        to={back}
        className="mt-8 flex min-h-11 items-center font-mono text-2xs text-accent underline decoration-1 underline-offset-2"
      >
        ← {entry.group ? t('pages.recipes.backToLine', { name: entry.group.name }) : t('pages.food.add.back')}
      </Link>
    </>
  )
}

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

  // While its own delete is in flight the row has already left the day's
  // rows (optimistically), so the screen keeps showing what was tapped.
  const [deleting, setDeleting] = useState<LoggedFood | null>(null)
  const [deleteFailed, setDeleteFailed] = useState(false)
  const entry: LoggedFood | undefined = entries.find((row) => row.id === id) ?? deleting ?? undefined
  // An ingredient was opened from its recipe line, and goes back there.
  const back = entry?.group ? `/food/meal/${entry.group.id}?date=${date}` : `/food?date=${date}`

  // The row can be gone, deleted on another device. Nothing to edit then, and
  // no reason to sit on a dead screen.
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

  // The delete first, then back: the screen it returns to then reads the day
  // without the row, rather than racing the delete and showing it for a beat.
  async function onDelete() {
    if (!id || !entry) return
    const removed = entry
    setDeleting(removed)
    setDeleteFailed(false)
    if (!(await remove(id))) {
      setDeleting(null)
      setDeleteFailed(true)
      return
    }
    navigate(back)
    // The undo the button's comment promises (§14), as the day's swipe has.
    toast(t('pages.food.deleted', { name: removed.food.name }), {
      action: {
        label: t('common.undo'),
        onClick: () =>
          void restore(removed).then((ok) => {
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
        pending={pending || deleting !== null}
        onClick={onDelete}
      >
        {t('pages.food.entry.delete')}
      </Button>
      {deleteFailed ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {t('pages.food.entry.deleteFailed')}
        </p>
      ) : null}

      <Link
        to={back}
        className="mt-8 flex min-h-11 items-center font-mono text-2xs text-accent underline decoration-1 underline-offset-2"
      >
        ← {entry.group ? t('pages.recipes.backToLine', { name: entry.group.name }) : t('pages.food.add.back')}
      </Link>
    </>
  )
}

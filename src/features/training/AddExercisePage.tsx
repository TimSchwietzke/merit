import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { PageHeader } from '@/components/PageHeader'
import { ExerciseCatalogue } from '@/features/training/ExerciseCatalogue'
import { todayKey } from '@/lib/date'

/**
 * Pick an exercise for the day.
 *
 * The catalogue itself is a component, because the routine editor needs the
 * same list in a sheet (§10.11). What is left here is what only a screen has:
 * the header, the way back, and where a pick goes.
 *
 * Picking writes nothing: an exercise with no sets under it is not training,
 * and a session littered with lifts somebody browsed past is worse than one
 * that starts empty.
 */
export default function AddExercisePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const date = params.get('date') ?? todayKey()

  return (
    <>
      <PageHeader title={t('pages.training.add.title')} lead={t('pages.training.add.lead')} />

      <ExerciseCatalogue
        date={date}
        onPick={(exercise) => navigate(`/training/day?date=${date}&exercise=${exercise.id}`)}
      />

      <Link
        to={`/training/day?date=${date}`}
        className="mt-4 inline-flex min-h-11 items-center font-mono text-2xs text-accent underline decoration-1 underline-offset-2"
      >
        ← {t('pages.training.add.back')}
      </Link>
    </>
  )
}

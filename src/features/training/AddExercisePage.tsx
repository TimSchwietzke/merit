import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { PageHeader } from '@/components/PageHeader'
import { Row, Rows } from '@/components/Rows'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useWorkout } from '@/features/training/useWorkout'
import { todayKey } from '@/lib/date'
import { supabase } from '@/lib/supabase'

/**
 * Pick an exercise for the day.
 *
 * Picking one does not write anything: an exercise with no sets under it is not
 * training, and a session littered with lifts somebody browsed past is worse
 * than one that starts empty. The choice is carried back in the query string
 * and the day opens its form for it.
 */
interface Found {
  id: string
  nameEn: string
  nameDe: string
  muscleGroup: string
  equipment: string
}

const SELECT = 'id, name_en, name_de, muscle_group, equipment'
const LIMIT = 40

export default function AddExercisePage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const date = params.get('date') ?? todayKey()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Found[]>([])
  const [failed, setFailed] = useState(false)
  const { sets } = useWorkout(date)

  useEffect(() => {
    let active = true
    const trimmed = query.trim()

    const timer = setTimeout(() => {
      // No minimum length: the catalogue is small enough to browse, and asking
      // somebody to type before they can see what exists is the wrong default
      // for a list of thirty lifts.
      const request = supabase.from('exercises').select(SELECT).order('name_' + (locale === 'de' ? 'de' : 'en'))
      const filtered =
        trimmed === ''
          ? request.limit(LIMIT)
          : request.or(`name_en.ilike.%${trimmed}%,name_de.ilike.%${trimmed}%`).limit(LIMIT)

      void filtered.then(({ data, error }) => {
        if (!active) return
        if (error || !data) {
          setFailed(true)
          return
        }
        setFailed(false)
        setResults(
          data.map((row) => ({
            id: row.id,
            nameEn: row.name_en,
            nameDe: row.name_de,
            muscleGroup: row.muscle_group,
            equipment: row.equipment,
          })),
        )
      })
    }, 200)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [query, locale])

  const alreadyToday = new Set(sets.map((set) => set.exerciseId))

  return (
    <>
      <PageHeader title={t('pages.training.add.title')} lead={t('pages.training.add.lead')} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="exercise-search">{t('pages.training.add.search')}</Label>
        <Input
          id="exercise-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
        />
      </div>

      <section className="mt-6">
        {failed ? (
          <p role="alert" className="text-sm text-danger">
            {t('pages.training.add.searchFailed')}
          </p>
        ) : results.length === 0 ? (
          <p className="rounded-lg border border-line bg-surface px-4 py-6 text-center text-sm text-ink-muted">
            {t('pages.training.add.noResults')}
          </p>
        ) : (
          <Rows>
            {results.map((exercise) => (
              <Row
                key={exercise.id}
                onClick={() => navigate(`/training?date=${date}&exercise=${exercise.id}`)}
              >
                <span className="min-w-0 flex-1 truncate">
                  {locale === 'de' ? exercise.nameDe : exercise.nameEn}
                </span>
                {alreadyToday.has(exercise.id) ? (
                  <span className="shrink-0 font-mono text-2xs text-accent">·</span>
                ) : null}
                <span className="shrink-0 font-mono text-2xs text-ink-faint">
                  {t(`pages.training.groups.${exercise.muscleGroup}` as 'pages.training.groups.chest')}
                </span>
              </Row>
            ))}
          </Rows>
        )}
      </section>

      <Link
        to={`/training?date=${date}`}
        className="mt-8 inline-flex min-h-11 items-center font-mono text-2xs text-accent underline decoration-1 underline-offset-2"
      >
        ← {t('pages.training.add.back')}
      </Link>
    </>
  )
}

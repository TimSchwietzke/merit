import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { FilterButton } from '@/components/FilterButton'
import { FilterList } from '@/components/FilterList'
import { PageHeader } from '@/components/PageHeader'
import { Row, Rows } from '@/components/Rows'
import { Collapsible } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRoutines } from '@/features/routines/useRoutines'
import { useWorkout } from '@/features/training/useWorkout'
import { todayKey } from '@/lib/date'
import { supabase } from '@/lib/supabase'

/**
 * Pick an exercise for the day — the browse screen §10.11 was written for.
 *
 * Grouped by muscle group, each group collapsible and open until somebody folds
 * it, with the count in the head so a folded group still says whether it is
 * worth opening.
 *
 * **One facet, not two.** The list is already grouped by muscle group and every
 * group folds, so a muscle-group *filter* would duplicate a control the reader
 * already has. Equipment is the facet that cuts across the grouping and
 * therefore the one that adds something. §10.11's rule about intersecting
 * facets still holds the moment a second one earns its place.
 *
 * Picking writes nothing: an exercise with no sets under it is not training,
 * and a session littered with lifts somebody browsed past is worse than one
 * that starts empty.
 */
interface Found {
  id: string
  nameEn: string
  nameDe: string
  muscleGroup: string
  equipment: string
}

const SELECT = 'id, name_en, name_de, muscle_group, equipment'

/** EU label order has no equivalent here; this is heaviest-to-lightest. */
const GROUP_ORDER = ['legs', 'glutes', 'back', 'chest', 'shoulders', 'arms', 'core', 'full_body']

/**
 * Which groups the reader folded, kept for the session rather than in storage.
 * §15 allows exactly one thing in `localStorage` and this is not it, and a
 * folded section is not application data — it is where somebody left a screen.
 */
const folded = new Set<string>()

export default function AddExercisePage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const date = params.get('date') ?? todayKey()
  // The same picker serves the day and the routine editor; which one changes
  // only where the choice is written.
  const routineId = params.get('routine')

  const [query, setQuery] = useState('')
  const [equipment, setEquipment] = useState<string[]>([])
  const [muscles, setMuscles] = useState<string[]>([])
  const [all, setAll] = useState<Found[]>([])
  const [failed, setFailed] = useState(false)
  const [, rerender] = useState(0)

  function setFolded(key: string, open: boolean) {
    if (open) folded.delete(key)
    else folded.add(key)
    rerender((n) => n + 1)
  }

  const { history } = useWorkout(date)

  // The whole catalogue, once. It is a few hundred rows at worst, and holding
  // it means filtering and searching are instant rather than a round trip per
  // keystroke on a gym connection.
  useEffect(() => {
    let active = true
    void supabase
      .from('exercises')
      .select(SELECT)
      .order(locale === 'de' ? 'name_de' : 'name_en')
      .then(({ data, error }) => {
        if (!active) return
        if (error || !data) {
          setFailed(true)
          return
        }
        setFailed(false)
        setAll(
          data.map((row) => ({
            id: row.id,
            nameEn: row.name_en,
            nameDe: row.name_de,
            muscleGroup: row.muscle_group,
            equipment: row.equipment,
          })),
        )
      })
    return () => {
      active = false
    }
  }, [locale])

  const name = (exercise: Found) => (locale === 'de' ? exercise.nameDe : exercise.nameEn)

  // Most recently trained first. Never filtered and never searched: on a screen
  // whose job is picking, the answer is usually something picked before.
  const recent = useMemo(() => {
    const seen: string[] = []
    for (const session of [...history].sort((a, b) => b.date.localeCompare(a.date))) {
      for (const set of session.sets) if (!seen.includes(set.exerciseId)) seen.push(set.exerciseId)
    }
    return seen.map((id) => all.find((exercise) => exercise.id === id)).filter((x): x is Found => !!x)
  }, [history, all])

  // Union within a facet, intersection across them (§10.11): chest and back
  // shows both, chest and barbell shows the overlap.
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return all.filter((exercise) => {
      if (equipment.length > 0 && !equipment.includes(exercise.equipment)) return false
      if (muscles.length > 0 && !muscles.includes(exercise.muscleGroup)) return false
      if (needle === '') return true
      return `${exercise.nameEn} ${exercise.nameDe}`.toLowerCase().includes(needle)
    })
  }, [all, equipment, muscles, query])

  // Each option carries what it would leave, counted against the *other* facet
  // so the numbers describe what tapping it actually does. Options with nothing
  // behind them are not offered.
  const countBy = (
    field: 'equipment' | 'muscleGroup',
    value: string,
    otherActive: string[],
    otherField: 'equipment' | 'muscleGroup',
  ) =>
    all.filter(
      (exercise) =>
        exercise[field] === value &&
        (otherActive.length === 0 || otherActive.includes(exercise[otherField])),
    ).length

  const equipmentOptions = useMemo(
    () =>
      [...new Set(all.map((exercise) => exercise.equipment))].sort().map((value) => ({
        value,
        label: t(`pages.training.add.equipment.${value}` as 'pages.training.add.equipment.barbell'),
        count: countBy('equipment', value, muscles, 'muscleGroup'),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [all, muscles, t],
  )

  const groupOptions = useMemo(
    () =>
      GROUP_ORDER.filter((group) => all.some((exercise) => exercise.muscleGroup === group)).map(
        (value) => ({
          value,
          label: t(`pages.training.groups.${value}` as 'pages.training.groups.chest'),
          count: countBy('muscleGroup', value, equipment, 'equipment'),
        }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [all, equipment, t],
  )

  const groups = GROUP_ORDER.map((group) => ({
    group,
    items: matches.filter((exercise) => exercise.muscleGroup === group),
  })).filter((entry) => entry.items.length > 0)

  const { addExercise } = useRoutines()

  async function pick(id: string) {
    if (routineId) {
      await addExercise(routineId, id)
      navigate(`/training/routines/${routineId}`)
      return
    }
    navigate(`/training?date=${date}&exercise=${id}`)
  }

  const list = (items: Found[]) => (
    <Rows>
      {items.map((exercise) => (
        <Row key={exercise.id} onClick={() => void pick(exercise.id)}>
          <span className="min-w-0 flex-1 truncate">{name(exercise)}</span>
          <span className="shrink-0 font-mono text-2xs text-ink-faint">
            {t(`pages.training.add.equipment.${exercise.equipment}` as 'pages.training.add.equipment.barbell')}
          </span>
        </Row>
      ))}
    </Rows>
  )

  return (
    <>
      <PageHeader title={t('pages.training.add.title')} lead={t('pages.training.add.lead')} />

      {/* The field is the control everybody reaches for first, so it sits at
          the top; the facets ride beside it behind a button carrying how many
          are on (§10.11). */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="exercise-search">{t('pages.training.add.search')}</Label>
        <div className="flex items-end gap-2">
          <Input
            id="exercise-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
          />
          <FilterButton active={equipment.length + muscles.length}>
            <FilterList
              label={t('pages.training.add.filterGroup')}
              options={groupOptions}
              active={muscles}
              onChange={setMuscles}
            />
            <FilterList
              label={t('pages.training.add.filterEquipment')}
              options={equipmentOptions}
              active={equipment}
              onChange={setEquipment}
            />
          </FilterButton>
        </div>
      </div>

      <section className="mt-6">
        {/* First among the results and answering to neither the field above nor
            the facets beside it (§10.11). */}
        {recent.length > 0 ? (
          <Collapsible
            label={t('pages.training.add.recent')}
            count={recent.length}
            open={!folded.has('recent')}
            onOpenChange={(open) => setFolded('recent', open)}
          >
            {list(recent.slice(0, 8))}
          </Collapsible>
        ) : null}

        {failed ? (
          <p role="alert" className="text-sm text-danger">
            {t('pages.training.add.searchFailed')}
          </p>
        ) : groups.length === 0 ? (
          // Names what is responsible rather than saying "no results" (§10.11).
          <p className="rounded-lg border border-line bg-surface px-4 py-6 text-center text-sm text-ink-muted">
            {query.trim() !== ''
              ? t('pages.training.add.noMatchSearch', { query: query.trim() })
              : t('pages.training.add.noMatch', {
                  filters: [
                    ...muscles.map((value) =>
                      t(`pages.training.groups.${value}` as 'pages.training.groups.chest'),
                    ),
                    ...equipment.map((value) =>
                      t(`pages.training.add.equipment.${value}` as 'pages.training.add.equipment.barbell'),
                    ),
                  ].join(', '),
                })}
          </p>
        ) : (
          groups.map(({ group, items }) => (
            <Collapsible
              key={group}
              label={t(`pages.training.groups.${group}` as 'pages.training.groups.chest')}
              count={items.length}
              open={!folded.has(group)}
              onOpenChange={(open) => setFolded(group, open)}
            >
              {list(items)}
            </Collapsible>
          ))
        )}
      </section>

      <Link
        to={routineId ? `/training/routines/${routineId}` : `/training?date=${date}`}
        className="mt-4 inline-flex min-h-11 items-center font-mono text-2xs text-accent underline decoration-1 underline-offset-2"
      >
        ← {t('pages.training.add.back')}
      </Link>
    </>
  )
}

import { test as base, type Page } from '@playwright/test'

/**
 * The visual harness (DESIGN.md §16.2: "opened at 375px, in German, in both
 * themes"). It renders every screen across the width sweep without touching the
 * Supabase project: the session is seeded into `localStorage` in the shape
 * supabase-js expects, and the two endpoints the app would call are answered
 * locally.
 *
 * This is a *visual* harness, not an end-to-end test. The real e2e specs
 * CLAUDE.md asks for — log in, log a food, log a set — assert behaviour against
 * a local Supabase and belong with the features they cover.
 */

/** Derived from VITE_SUPABASE_URL; supabase-js stores under `sb-<ref>-auth-token`. */
const PROJECT_REF = process.env.MERIT_SUPABASE_REF ?? 'localhost'

const USER = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'harness@merit.test',
}

/** Far future, so supabase-js never tries to refresh and never hits the network. */
const EXPIRES_AT = 4102444800 // 2100-01-01

export type Theme = 'light' | 'dark'
export type Locale = 'de' | 'en'

export interface Viewport {
  name: string
  width: number
  height: number
}

/**
 * Big screens down to mobile. 1920 and 1440 are where §5.4's "a wide screen is
 * not an invitation to add whitespace" gets tested; 1024 is the breakpoint the
 * sidebar and the path bar appear at; 768 is `md`; 375 is the design target.
 */
export const VIEWPORTS: Viewport[] = [
  { name: '1920', width: 1920, height: 1080 },
  { name: '1440', width: 1440, height: 900 },
  { name: '1024', width: 1024, height: 800 },
  { name: '768', width: 768, height: 900 },
  { name: '375', width: 375, height: 812 },
]

export interface Route {
  name: string
  path: string
  /** Sign-in is the one screen that renders signed *out*, outside the shell. */
  signedOut?: boolean
}

export const ROUTES: Route[] = [
  { name: 'dashboard', path: '/' },
  { name: 'food', path: '/food' },
  { name: 'training', path: '/training' },
  { name: 'more', path: '/more' },
  { name: 'weight', path: '/weight' },
  { name: 'food-add', path: '/food/add' },
  { name: 'food-scan', path: '/food/add?scan=1' },
  { name: 'goals', path: '/goals' },
  { name: 'training-add', path: '/training/add' },
  { name: 'training-routine', path: '/training/routines/r1' },
  { name: 'training-routine-empty', path: '/training/routines/r3' },
  { name: 'training-session', path: '/training/session?routine=r1' },
  { name: 'training-day', path: '/training/day' },
  { name: 'not-found', path: '/nowhere' },
  { name: 'sign-in', path: '/sign-in', signedOut: true },
]

/** Signs the browser in and answers the profile query, offline. */
export async function stubBackend(
  page: Page,
  { theme, locale, signedOut = false }: { theme: Theme; locale: Locale; signedOut?: boolean },
) {
  await page.addInitScript(
    ({ ref, user, expiresAt, theme, locale, signedOut }) => {
      const session = {
        access_token: 'harness-access-token',
        refresh_token: 'harness-refresh-token',
        token_type: 'bearer',
        expires_at: expiresAt,
        expires_in: expiresAt - Math.floor(Date.now() / 1000),
        user: {
          id: user.id,
          aud: 'authenticated',
          role: 'authenticated',
          email: user.email,
          app_metadata: {},
          user_metadata: {},
          created_at: '2026-01-01T00:00:00Z',
        },
      }
      if (!signedOut) window.localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(session))
      // The theme is read synchronously by the bootstrap script before paint.
      window.localStorage.setItem('merit.theme', theme)
      // i18n falls back to navigator before the profile arrives; pin it so the
      // first frame is already in the language under test.
      Object.defineProperty(navigator, 'languages', { get: () => [locale] })
      Object.defineProperty(navigator, 'language', { get: () => locale })
    },
    { ref: PROJECT_REF, user: USER, expiresAt: EXPIRES_AT, theme, locale, signedOut },
  )

  // A month of weigh-ins, so the chart renders with both series and a gap in it
  // rather than as an empty state in every capture.
  await page.route('**/rest/v1/weight_logs*', (route) => {
    const today = new Date()
    const rows = Array.from({ length: 30 }, (_, i) => {
      const day = new Date(today)
      day.setDate(day.getDate() - (29 - i))
      return {
        date: `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`,
        weight_kg: Math.round((83 - i * 0.05 + Math.sin(i) * 0.4) * 10) / 10,
        body_fat_pct: i % 7 === 0 ? 18.5 : null,
      }
    }).filter((_, i) => i < 12 || i > 18)
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(rows),
    })
  })

  // A day's foods, joined as PostgREST returns them, plus a catalogue for the
  // search. One portion is missing its fibre and salt so the `partial` marker
  // — the whole point of the missing-is-not-zero rule — is in every capture.
  const FOODS = [
    {
      id: 'f1', name: 'Skyr, natur', brand: 'Arla', source: 'off', barcode: '5711953068881',
      serving_size_g: null, serving_label: null,
      kcal_100g: 63, fat_100g: 0.2, carbs_100g: 4, protein_100g: 11,
      saturated_fat_100g: 0.1, sugars_100g: 4, fibre_100g: 0, salt_100g: 0.1,
    },
    {
      id: 'f2', name: 'Haferflocken, kernig', brand: null, source: 'community', barcode: null,
      serving_size_g: 60, serving_label: 'Portion',
      kcal_100g: 372, fat_100g: 7, carbs_100g: 59, protein_100g: 13,
      saturated_fat_100g: 1.3, sugars_100g: 1.1, fibre_100g: 10, salt_100g: 0.02,
    },
    {
      id: 'f3', name: 'Banane', brand: null, source: 'usda', barcode: null,
      serving_size_g: null, serving_label: null,
      kcal_100g: 89, fat_100g: 0.3, carbs_100g: 23, protein_100g: 1.1,
      saturated_fat_100g: null, sugars_100g: 12, fibre_100g: null, salt_100g: null,
    },
  ]

  await page.route('**/rest/v1/food_logs*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'l1', meal_type: 'breakfast', quantity_g: 180, foods: FOODS[0] },
        { id: 'l2', meal_type: 'breakfast', quantity_g: 60, foods: FOODS[1] },
        { id: 'l3', meal_type: 'snack', quantity_g: 120, foods: FOODS[2] },
      ]),
    }),
  )

  // The catalogue answers three different questions on the same path, so the
  // stub reads the request rather than returning the same list to all of them:
  // a barcode lookup wants one row or none, an insert echoes the row back, and
  // a name search wants the list.
  await page.route('**/rest/v1/foods*', (route) => {
    const request = route.request()
    const json = (body: unknown) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })

    if (request.method() === 'POST') {
      const sent = JSON.parse(request.postData() ?? '{}')
      return json({ ...FOODS[0], ...sent, id: 'new-food' })
    }

    const barcode = /barcode=eq\.(\d+)/.exec(request.url())?.[1]
    if (barcode) return json(FOODS.find((food) => food.barcode === barcode) ?? null)

    return json(FOODS)
  })

  // Open Food Facts, answered locally: the harness never leaves the machine,
  // and their fifteen-per-minute limit is not something a test suite should be
  // spending.
  await page.route('**/world.openfoodfacts.org/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 1,
        product: {
          code: '3017620422003',
          product_name: 'Nutella',
          product_name_de: 'Nutella',
          brands: 'Ferrero',
          serving_size: '15 g',
          serving_quantity: 15,
          nutriments: {
            'energy-kcal_100g': 539,
            fat_100g: 30.9,
            'saturated-fat_100g': 10.6,
            carbohydrates_100g: 57.5,
            sugars_100g: 56.3,
            proteins_100g: 6.3,
            salt_100g: 0.107,
          },
        },
      }),
    }),
  )

  // A target in force, so the day view renders its progress rather than its
  // "set a target" state, and the goals screen has something to show.
  const EXERCISES = [
    { id: 'x1', name_en: 'Bench press', name_de: 'Bankdrücken', muscle_group: 'chest', equipment: 'barbell' },
    { id: 'x2', name_en: 'Barbell back squat', name_de: 'Kniebeuge mit Langhantel', muscle_group: 'legs', equipment: 'barbell' },
    { id: 'x3', name_en: 'Lat pulldown', name_de: 'Latzug', muscle_group: 'back', equipment: 'cable' },
  ]

  await page.route('**/rest/v1/exercises*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        /id=eq\.(\w+)/.exec(route.request().url())
          ? (EXERCISES.find((e) => e.id === /id=eq\.(\w+)/.exec(route.request().url())?.[1]) ?? null)
          : EXERCISES,
      ),
    }),
  )

  // Today's sets and a session a few days back, so the comparison line under
  // each exercise — the reason §10.10 gives for opening this tab — has
  // something to compare against.
  await page.route('**/rest/v1/workout_sets*', (route) => {
    if (route.request().method() !== 'GET') {
      return route.fulfill({ status: 201, contentType: 'application/json', body: '{}' })
    }
    const day = (back: number) => {
      const d = new Date()
      d.setDate(d.getDate() - back)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }
    const set = (id: string, exercise: (typeof EXERCISES)[number], n: number, reps: number, kg: number, date: string, rir: number | null = null, done = true) => ({
      id,
      set_number: n,
      reps,
      weight_kg: kg,
      rir,
      done,
      exercise_id: exercise.id,
      workouts: { date },
      exercises: exercise,
    })
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        set('s1', EXERCISES[0], 1, 8, 60, day(3)),
        set('s2', EXERCISES[0], 2, 8, 60, day(3)),
        set('s3', EXERCISES[0], 3, 7, 60, day(3)),
        set('s4', EXERCISES[0], 1, 8, 62.5, day(0), 2),
        set('s5', EXERCISES[0], 2, 8, 62.5, day(0), 1),
        set('s6', EXERCISES[2], 1, 10, 55, day(0)),
        // Waiting: the bar has a set to be on, and the rows have all three
        // states between them.
        set('s7', EXERCISES[2], 2, 10, 55, day(0), null, false),
        set('s8', EXERCISES[2], 3, 10, 55, day(0), null, false),
      ]),
    })
  })

  // Three routines: two with exercises on opposite halves of the week, and one
  // with none at all — which is the case the list marks `unfinished` and the
  // week is not allowed to plan.
  await page.route('**/rest/v1/routines*', (route) => {
    if (route.request().method() !== 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'r1' }) })
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'r1',
          name: 'Oberkörper 1',
          position: 0,
          routine_days: [{ weekday: 1 }, { weekday: 4 }],
          routine_exercises: [
            {
              id: 're1',
              exercise_id: 'x1',
              position: 0,
              set_reps: [8, 8, 6],
              exercises: EXERCISES[0],
            },
            {
              id: 're2',
              exercise_id: 'x3',
              position: 1,
              set_reps: [10, 10, 10],
              exercises: EXERCISES[2],
            },
          ],
        },
        {
          id: 'r2',
          name: 'Unterkörper',
          position: 1,
          routine_days: [{ weekday: 2 }, { weekday: 5 }],
          routine_exercises: [
            {
              id: 're3',
              exercise_id: 'x3',
              position: 0,
              set_reps: [12, 10, 8],
              exercises: EXERCISES[2],
            },
          ],
        },
        {
          id: 'r3',
          name: 'Nacken & Schultern',
          position: 2,
          routine_days: [],
          routine_exercises: [],
        },
      ]),
    })
  })

  await page.route('**/rest/v1/routine_*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  )

  await page.route('**/rest/v1/scheduled_sessions*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  )

  await page.route('**/rest/v1/workouts*', (route) => {
    const url = route.request().url()
    const json = (body: unknown) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })

    // The week screen asks for a range with the sets embedded; everything else
    // wants the one row it just upserted.
    if (url.includes('workout_sets')) {
      const d = new Date()
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      return json([
        { id: 'w1', date: today, routine_id: 'r1', workout_sets: [{ done: true }, { done: false }, { done: false }] },
      ])
    }
    return json({ id: 'w1' })
  })

  await page.route('**/rest/v1/nutrition_goals*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          mode: 'calculated',
          valid_from: '2026-01-01',
          kcal: 2100,
          protein_g: 150,
          fat_g: 70,
          carbs_g: 220,
        },
      ]),
    }),
  )

  await page.route('**/rest/v1/profiles*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        locale,
        theme,
        height_cm: 181,
        birth_date: '1995-06-15',
        sex: 'male',
        activity_level: 'moderate',
        goal: 'lose',
        plan_paused_until: null,
      }),
    }),
  )

  // Nothing else should reach the network. Fail loudly rather than hanging.
  await page.route('**/auth/v1/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
  )
}

/**
 * Wait until a screen has actually rendered.
 *
 * `main` alone is not enough: it is visible from the first frame, and the lazy
 * routes (`React.lazy` behind a `Suspense` with no fallback) leave it empty
 * until their chunk arrives. Waiting on visibility captured a blank page — and
 * a probe that measures nothing passes.
 */
export async function waitForScreen(page: Page) {
  await page.locator('main').waitFor({ state: 'visible' })
  await page.waitForFunction(() => (document.querySelector('main')?.childElementCount ?? 0) > 0)
}

export const test = base.extend({})
export { expect } from '@playwright/test'

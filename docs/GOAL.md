# Merit — Project Goal

**Merit** — *Meals, Exercise, Reps, Intake, Training*.
A self-hosted, invite-only web app for tracking nutrition and strength training.

---

## 1. Purpose

A single app to track what you eat and how you train, for a small private group
(~10–30 users: friends and family). Not a commercial product. Built to be
genuinely used daily, and to serve as a portfolio project demonstrating a
complete, production-deployed application.

**Success criteria:** the author and his friends use it instead of MyFitnessPal
for at least three months.

---

## 2. Scope

### 2.1 MVP (must ship first)

| Area | What it does |
|---|---|
| **Auth** | Invite-only. Users are created manually or via invite code. No open sign-up. |
| **Weight** | Log body weight. Optional: body fat %, body measurements. |
| **Nutrition** | Log food per day and meal. Calories + macros (protein / fat / carbs). |
| **Barcode** | Scan a barcode with the phone camera, resolve to a food, log it. |
| **Strength training** | Build routines, schedule them into the week, log sets (exercise, reps, weight, optional RIR). |
| **Visualisation** | Charts for weight, calories/macros, and strength progression. |
| **Settings** | Language (DE/EN), theme (light/dark), goal configuration, data export, account deletion. |

### 2.2 Next iteration (after MVP, in this order)

1. Own recipes / composite meals (define once, log as a single item)
2. Cardio tracking
3. Apple Health / wearable import (steps, active calories) — manual entry for
   these is explicitly *not* worth building, nobody keeps it up
4. Social features: friends, groups, comparing progress, sharing recipes

### 2.3 Explicitly out of scope

- Meal photos
- Meal-prep / weekly meal planning
- Coaching, AI suggestions, or any form of dietary advice
- Public sign-up, payments, or any commercial feature

---

## 3. Users and access

- **Invite-only** for the MVP. Later: registration with an invite code.
- Every user sees **only their own** logs.
- The food catalogue and exercise catalogue are **shared across all users** —
  if one person adds a product, everybody has it. This is deliberate: it makes
  the catalogue grow by itself.

---

## 4. Food data — where nutrition values come from

Lookup order when a user adds a food:

1. **Own database** (`foods` table) — already known products and anything users
   have added by hand.
2. **Open Food Facts API** — barcode lookup for packaged products.
   Read requests need no API key, only a custom `User-Agent`
   (`Merit/1.0 (contact@example.com)`).
   Rate limit: 15 req/min/IP for product reads, 10 req/min/IP for search.
   Call this **client-side** so the limit applies per user, not per server.
   Licence: ODbL — requires attribution in the app.
3. **USDA FoodData Central** — text search for unpackaged whole foods
   (banana, chicken breast, rice), which Open Food Facts covers poorly.
   Licence: CC0 / public domain — no attribution or share-alike required.
   Needs a free api.data.gov key. **The key must never reach the client or the
   repo** — proxy this through a Supabase Edge Function with the key stored as
   a secret.
4. **Manual entry** — the user types name and nutrition values. Saved to the
   shared `foods` table with `source = 'community'`, so the next person who
   scans that barcode gets a hit.

Nutrition detail: Merit tracks the full EU mandatory declaration — energy, fat,
of which saturates, carbohydrate, of which sugars, protein, salt — plus fibre.
These are real columns on `foods`, because they appear on every European package
and Open Food Facts fills them reliably. Displayed in EU label order so the screen
matches the packaging that was just scanned (DESIGN.md §10.10).

Only calories, protein, fat and carbohydrate get user-set targets. Fibre, sugars,
saturates and salt use reference values and are switched off by default.

**A missing nutrient is not a zero.** If a food carries no fibre value, the day's
fibre total is marked partial rather than summed as though the value were zero.
Silently treating absent data as zero is the most misleading thing this view
could do.

Micronutrients beyond these: store them in `micros` when the source provides them,
but do not build UI that depends on them (e.g. collapsable). Open Food Facts coverage for vitamins
and minerals is too patchy to show meaningful daily targets.

---

## 5. Key product decisions

- **Portions:** every food is stored per 100 g / 100 ml. If serving data exists,
  offer both ("1 serving" / "grams"). Fallback is always grams/millilitres.
- **Fast logging:** "recently used" and "favourites" are first-class. Repeating
  yesterday's breakfast must be one tap. This matters more for daily use than
  any other feature.
- **Calorie goal:** the user can either enter a target manually, or let the app
  calculate one from height, age, sex, activity level and goal. Both must work,
  and the user can switch.
- **Weight chart:** shows raw daily values *and* a 7-day rolling average as two
  separate series in different colours. Either series can be hidden in settings.
  Daily weight is too noisy to read a trend from raw values alone.
- **Training plan:** users define routines as reusable templates
  ("Upper A", "Lower B"), then schedule them (e.g. Monday = Upper A). Individual
  sessions can be moved or edited without breaking the plan; the plan itself can
  also be edited as a whole.
- **Set logging:** exercise, set number, reps, weight, and optional RIR
  (reps in reserve — how many more reps would have been possible).
- **Progression display:** when logging an exercise, show what was done last
  time for that exercise ("last time: 3×8 @ 60 kg").
- **Exercise images:** schematic illustrations, not photos of people. Ship the
  MVP with a placeholder; source freely licensed images later (e.g. the Free
  Exercise DB). The schema has an `image_url` from day one; it just stays empty.
- **Offline:** workout logging must work without a connection (gyms often have
  no signal in the basement). Write locally, sync when the connection returns.
  Nutrition and barcode scanning may stay online-only — scanning needs the API
  anyway.

---

## 6. Dashboard

What the user sees when opening the app, top to bottom:

1. A clear, calm visual summary of the day (Apple-Health-like in feel, not a
   wall of numbers)
2. Today's nutrition: calories consumed, remaining budget, macro split
3. Today's training:
   - if a session is scheduled and done → a short congratulatory line
   - if scheduled and not done → a reminder
   - if nothing is scheduled → note that it's a rest day and when the next
     session is due

---

## 7. Data model (target)

Normalised to 3NF. Nutrition values live once in `foods` and are referenced,
never copied into log rows.

**Shared (global, not user-scoped)**

- `foods` — id, barcode (unique, nullable), name, brand, kcal_100g, fat_100g,
  saturated_fat_100g, carbs_100g, sugars_100g, fibre_100g, protein_100g, salt_100g,
  micros (jsonb, nullable), serving_size_g, serving_label,
  source (`off` | `usda` | `community`), created_by, created_at
- `exercises` — id, name_en, name_de, muscle_group, equipment, image_url
  (nullable), source, created_by

**User-scoped**

- `profiles` — user_id, display_name, locale, theme, height_cm, birth_date, sex,
  activity_level, goal
- `nutrition_goals` — user_id, mode (`manual` | `calculated`), kcal, protein_g,
  fat_g, carbs_g, valid_from
- `weight_logs` — user_id, date, weight_kg, body_fat_pct (nullable),
  measurements (jsonb, nullable)
- `food_logs` — user_id, date, meal_type, food_id, quantity_g
- `food_favourites` — user_id, food_id
- `routines` — user_id, name, position
- `routine_exercises` — routine_id, exercise_id, position, target_sets,
  target_reps
- `scheduled_sessions` — user_id, routine_id, scheduled_date, status
- `workouts` — user_id, date, routine_id (nullable), notes
- `workout_sets` — workout_id, exercise_id, set_number, reps, weight_kg,
  rir (nullable)

**Rules**

- Every user-scoped table has a `user_id` and an RLS policy `user_id = auth.uid()`.
- `foods` and `exercises`: read allowed for all authenticated users; insert
  allowed for all authenticated users; update only by `created_by`.
- Free-logging (picking an exercise without a routine) must stay possible —
  `workouts.routine_id` is nullable for exactly this reason.

---

## 8. Legal and privacy

Weight, nutrition and training data are health data (GDPR Art. 9), so this is
not optional even for a small private group.

- Supabase project must be created in an **EU region (Frankfurt)**. This cannot
  be changed later without a migration.
- Privacy policy plus an explicit consent checkbox at sign-up, naming health
  data specifically.
- Imprint page.
- Data export (JSON) and account deletion must both be implemented, not planned.
- Accept the standard data processing agreements offered by Supabase and Vercel.
- No analytics or tracking in the MVP. As long as the only cookie/token is the
  auth session, no cookie banner is required.

*Not legal advice — verify before opening this beyond a private circle.*

---

## 9. Non-goals for the code

- No premature abstraction. Two similar components are fine; extract on the third.
- No state management library until `useState` and Supabase's own cache
  demonstrably fall short.
- No new design language. `DESIGN.md` is the authority and it is already written —
  it is the house style shared with NCLA, adapted for a phone. Do not invent
  tokens, do not add a colour, do not import a component library's own look.
- shadcn/ui is a **behaviour layer, not a visual one.** It is used for the Radix
  primitives that are tedious and easy to get subtly wrong — focus traps, ARIA
  wiring, portals, dismiss handling. Every component it provides is restyled to
  `DESIGN.md` §3.2 in the same commit that adds it. Layout and list primitives
  (Panel, Rows, SectionHead, Statement) are Merit's own; see `DESIGN.md` §3.3 for
  which shadcn components are used and which are deliberately not.

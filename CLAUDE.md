# CLAUDE.md

Working agreement for this repository. Read `docs/GOAL.md` for what the product
is and `DESIGN.md` for how it should look before writing UI. `DESIGN.md` is the
authority on anything visual: where it contradicts a library default, the library
loses and the component is overridden.

---

## Stack

- **Vite + React 19 + TypeScript** (strict mode, no `any`)
- **Tailwind CSS + shadcn/ui**: components are copied into `src/components/ui`
  and owned by this repo, not imported from a library
- **Supabase**: Postgres, Auth, Storage, Edge Functions. EU region (Frankfurt)
- **react-i18next**: German and English
- **Recharts** for charts
- **Dexie.js** (IndexedDB) for offline workout logging
- **Vitest** for unit tests, **Playwright** for end-to-end tests
- **Vercel** for hosting, deployed from `main` via the Git integration
- Docker is for the local development environment only, not for deployment

---

## Hard rules

1. **No secrets in the repo.** Never commit `.env`, API keys, or service-role
   keys. The USDA api.data.gov key lives in a Supabase Edge Function secret and
   must never reach the client. `.env.example` documents the variables with
   placeholder values.
2. **Row Level Security on every user-scoped table.** A migration that creates a
   table without an RLS policy is incomplete. Never use the service-role key in
   client code.
3. **No hardcoded user-facing strings.** Every string goes through i18n
   (`t('key')`) with entries in both `de` and `en` from the moment it is
   written. Retrofitting this later is painful.
4. **No `localStorage` for application data.** Use Dexie/IndexedDB for offline
   data and Supabase for everything else.
5. **Never write medical, dietary, or coaching advice into the UI.** The app
   shows the user's own numbers. It does not tell anyone what to eat or how to
   train.

---

## Conventions

### Structure

```
src/
  components/ui/     shadcn components (owned, editable)
  components/shell/  the app frame: AppShell, Nav
  components/        shared app components
  features/          one folder per domain: nutrition, weight, training, auth
    <feature>/       components, hooks, and queries for that feature
  lib/               supabase client, utils, formatters
  locales/           de.json, en.json
  styles/            tokens.css, fonts.css
  types/             shared types; database types generated from Supabase
supabase/
  migrations/        SQL migrations, including RLS policies
  functions/         Edge Functions
DESIGN.md            design system, root, read before any UI work
docs/                GOAL.md
```

### Naming

- Components `PascalCase.tsx`, hooks `useThing.ts`, everything else `kebab-case`
- Database: `snake_case`, plural table names
- Types generated from the database live in `src/types/database.ts` and are
  regenerated, never hand-edited

### Code

- Business logic (calorie maths, macro sums, rolling averages, training volume)
  goes in plain functions in `lib/`, not inside components. These are the
  functions that get unit tests.
- Dates: store as `date` in Postgres and treat "today" in the user's local
  timezone. Never rely on UTC for day boundaries, a meal logged at 23:30 belongs
  to that day.
- Money-like precision matters for nutrition: round only for display, never in
  storage or intermediate calculations.

### Commits and branches

- Conventional Commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`
- Work on branches, merge into `main` via pull request
- `main` must always be deployable, Vercel deploys it automatically

### Testing

- Unit tests (Vitest) are required for anything in `lib/` that calculates
  something. A calculation without a test does not ship.
- End-to-end tests (Playwright) cover the critical paths only:
  log in → log a food → it appears in the day view; log a workout set;
  scan fallback to manual entry.
- Aim for tests that would actually catch a regression. Do not add tests to
  raise a coverage number.

---

## How to work with me

- **Ask before inventing product behaviour.** If `docs/GOAL.md` does not answer
  a question about what the app should do, ask rather than guess.
- **Do not ask about code style.** It is in this file; follow it.
- **One feature at a time.** Finish and test a vertical slice (schema → query →
  UI → test) before starting the next.
- **Say when something is a bad idea.** If a request conflicts with the data
  model, the licence terms, or the privacy rules above, say so instead of
  implementing it.
- **Do not add dependencies casually.** Propose the dependency and the reason
  first; prefer the platform or a few lines of our own code.

---

## External data sources

- **Open Food Facts**: barcode lookups, client-side, custom `User-Agent`
  required, 15 req/min/IP. ODbL: the app must show attribution and a link.
- **USDA FoodData Central**: text search for whole foods, via Edge Function
  proxy, 1000 req/hour. CC0: no attribution required.
- Cache every resolved product into the `foods` table so the same lookup never
  hits an external API twice.

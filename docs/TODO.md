# What is left

Everything still open, with what each item actually means. Ordered by what
blocks daily use, not by size. `GOAL.md` says what the product is; this says
what is missing from it.

Nothing here is a promise about when. Items move up when they start costing
somebody something.

---

## MVP: blocks friends using this daily

### Offline training, the rest of it
- Logging works offline: every training write lands in IndexedDB and is sent
  from a queue, so a set logged in a basement survives the app being closed and
  goes out by itself when there is a signal.
- **Starting a routine still needs the network.** The routine list is not
  mirrored, so arriving at the gym with no signal and pressing start does
  nothing. Mirroring `routines` and `routine_exercises` the same way the sets
  are mirrored is the fix, and it is a small one.
- The rest of the app stays online: nutrition needs the network to scan
  anyway, and the weight chart is not something anybody opens underground.

---

## Wording: small, and the cheapest wins here

### Remove the explanatory in-between texts
- Sentences like *"The average is the mean of every weigh-in in the 7 days
  ending on that day. Days without one are left out, not filled in."*
  (`pages.weight.averageNote`) explain a chart that should explain itself.
- Sweep every long body string in `de.json`/`en.json`, keep the ones that carry
  legal or safety weight (consent, deletion, the shared-catalogue warning), and
  cut or shorten the rest. A screen that has to describe itself is a screen
  that needs a better label, not a better paragraph.
- Accessibility `aria` descriptions stay, since they are not visible prose.

### Make "volume" and "sessions" mean something
- `TrainingStats` shows *volumen* and *einheiten* side by side with the same
  "/ woche" underneath and no unit on the first. Nobody can tell what either
  number is counting.
- Volume is tonnes moved per week (sets × reps × weight); sessions is how many
  times you trained. Say so in the label or in one word beneath it, and put the
  unit on the number.

---

## After the MVP

### Water tracker
- Log glasses or millilitres per day, with a daily target. Same shape as the
  other day-scoped logs: one small table, RLS, one tile on the dashboard.
- Deliberately simple: a counter with a plus button, not a hydration
  programme.

### Recipes and composite meals
`GOAL.md` §2.2 item 1.

- Define a dish once from existing foods, then log it as a single item.
- The hardest part is the data model: a recipe is a food made of foods, and its
  nutrition has to be derived rather than copied, or it silently goes stale
  when an ingredient is corrected.

### Cardio
- `src/features/cardio/CardioPage.tsx` is a placeholder that says as much.
- Minimum: type, duration, optional distance, optional heart rate. Its own
  table, not squeezed into `workout_sets`.

### Apple Health / wearables
`GOAL.md` §2.2 item 3.

- Import steps and active calories. Manual entry for these is explicitly not
  worth building, because nobody keeps it up.
- Needs research first: a web app cannot read HealthKit directly. Likely a
  file import or a shortcut, not a live integration. Scope it before promising
  it.

### Left over from GOAL.md
- **Favourites** for foods: "recently used" exists, favourites do not.
  §5 calls both first-class for fast logging.
- **Body measurements**: the `measurements` column exists on `weight_logs`
  and nothing writes to it.
- **Calorie/macro chart** and **strength progression chart**: §2.1 asks for
  both, and only the weight chart is built.

### Demo account (open question)
- Wanted for the portfolio. Currently deliberately absent.
- It would make merit a publicly accessible service, which ends the "purely
  private, no imprint required" position in `LEGAL-INPUTS.md` §1. An imprint
  with a real address would then be needed.
- It also has to be genuinely read-only, enforced in RLS rather than in the UI,
  or the claim "visitors' input is not stored" is false.
- Decide the imprint route first. The feature is the easy half.

---

## Repository and quality

### README and repo clean-up
- There is no README. For a portfolio project that is the first thing anybody
  sees: what merit is, screenshots, the stack, how to run it locally, and the
  licence position of the data sources.
- Clean-up pass: dead files, stale comments, the `NotBuiltYet` placeholders,
  and `docs/` gaining an index now that it holds five documents.
- `humans.txt` beside the existing `robots.txt`: who built it, what it is built
  with, what the data sources are. Ten lines, and a portfolio reader is exactly
  the person who opens it.
- **No `llms.txt`.** It is a map for assistants and crawlers to read a site, and
  merit is a login wall that asks not to be indexed (`robots.txt`,
  `meta robots`). Publishing one would advertise a service nobody outside the
  household can reach, and would sit against the invite-only position in
  `LEGAL-INPUTS.md` §1.

### Ultrareview
- Run `/code-review ultra` over the whole branch history once the MVP is
  complete. A deep multi-agent review, not the inline one.
- Worth doing *after* profile and onboarding land, so it reviews the shape the
  app will actually keep. It is user-triggered and billed, so I cannot start it.

### Accessibility
- Basics are in place (semantic markup, `aria` labels on charts, focus
  handling from the Radix primitives) but nothing has been verified.
- Pass: keyboard navigation on every screen, visible focus rings, contrast
  against `DESIGN.md` tokens in both themes, screen-reader labels on
  icon-only buttons, `prefers-reduced-motion` on the reveal animations.

### UI/UX odds and ends
- The running list of small things: spacing that drifts between screens,
  loading states that flash, empty states that say nothing useful, touch
  targets under 44px, error messages that name no next step.
- Collect them as they are noticed rather than planning them up front.

### Docker for local development
- `CLAUDE.md` says Docker is for the local development environment only, never
  for deployment. That environment does not exist yet.
- Point: `docker compose up` gives a local Supabase and the dev server, so the
  app can be worked on without touching the production project, and so the
  repo is reproducible for anybody reading it as a portfolio piece.

---

## House style

- **No em dashes.** They read as machine-written. A colon, a comma, brackets or
  a full stop covers every case one was doing, and usually reads better.
- This applies to UI strings, documentation and code comments alike. The strings
  written before this rule still carry them and are swept with the wording pass
  above.

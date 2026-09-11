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

### What is left of the anti-slop pass
The wording pass, the em dash sweep and the radius ladder are done. Two things
were looked at and deliberately left alone:

- **Mono density.** 143 `font-mono` against three uses of the serif statement
  looked lopsided until it was checked against what each face is for: the mono
  is on numbers, units, counts and dates, which is measurement and exactly its
  job (`PRODUCT.md`, Brand Commitments), and the serif carries one sentence on
  the two screens that have one. Nothing to change.
- **Em dashes in the legal texts.** 17 in `documents.ts`, in prose a German
  legal generator produced. Left as they are, on the owner's call.

---

## Design questions, noticed on the phone

Both of these are decisions rather than tasks. Each one has a rule behind the
current state, and in both cases the rule may be producing something that reads
as an oversight.

### One domain has a `+` and two do not

`/training` has a floating `+` in the bottom right that creates a routine.
`/food` puts *add a food* and *scan a barcode* at the foot of the day's log,
and `/weight` has the form itself on the page, in the lower half. So the three
domains you add things to offer it three different ways.

`DESIGN.md` §10.10 is why: the floating button is allowed there and explicitly
"not a general licence for a FAB", because a screen with a single obvious
action puts it in the flow. That reasoning holds for `/weight`, where the form
is already on screen and a `+` would open something that is not hidden. It
holds less well for `/food`, where the add links sit under the log and a day
with fifteen entries puts them off the bottom of the screen.

Three ways to settle it:

1. **Give `/food` the same floating `+`** and leave `/weight` alone, since its
   action is never off screen. Two of three then match, and the odd one out is
   the one whose action is always visible.
2. **Take the floating button off `/training` too** and put *new routine* in
   the flow at the end of the week, which is where the eye ends up anyway.
   Consistent, and it removes the one component that fights the session bar for
   the corner a thumb rests on.
3. **Keep all three and say why in `DESIGN.md`**, so the next person reading
   the screens sees a rule rather than a drift.

Whichever wins, §10.10 gets the sentence that makes it a decision.

### The dashboard and nutrition are the same green

They are, and the code says so on purpose: `tokens.css` binds nutrition to
moss, moss is merit's own accent, and the dashboard is given no hue of its own
because "it is where the three meet". The consequence is that on the dashboard
the chrome, the focus ring and the nutrition block are one colour with two
different meanings, and a reader cannot tell whether the green means *merit* or
means *food*.

It looks like a leftover, and the fix is not obviously "give nutrition a new
hue": moss was chosen for a health tool and nutrition is the most-used domain
in the app, so moving it costs the brand its own colour on the screen it is
used most.

1. **Make the dashboard greyscale.** Nothing on it carries accent except the
   blocks themselves, each already wearing its own domain hue. The green there
   then means nutrition and only nutrition. Cheapest, and it makes the rule
   true rather than nearly true.
2. **Give nutrition its own hue** and keep moss for merit alone. The most
   honest, and the most work: a fourth domain colour has to clear AA on three
   planes in both themes (§16.3), and the app's most-used screen changes colour.
3. **Write it down as intended** and stop calling it a question: merit's colour
   is the colour of the domain it grew out of.

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

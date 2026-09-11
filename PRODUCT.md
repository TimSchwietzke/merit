# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Ten to thirty people: the author, his friends and his family. Invite-only, no
open sign-up, no commercial audience. Everyone in the group is on an iPhone.

Two situations, and they are not alike:

- **Standing in a gym between sets**, one-handed, phone in the hand not holding
  a bar, sometimes with chalk on it. Attention is a few seconds at a time and
  the next set is the thing that matters.
- **Sitting or standing at home or in a shop**, logging what was eaten or
  scanning a barcode. Less hurried, more typing, often one-handed anyway.

A third, quieter one: looking at the week or the last three months to see
whether anything is moving.

## Product Purpose

One app for what you eat and how you train, replacing MyFitnessPal for this
group. Success is the author and his friends still using it daily three months
after it ships. It is also a portfolio project and is deployed and operated for
real, which is why the legal, export and deletion obligations are treated as
shipping requirements rather than as paperwork.

## Positioning

Three things a neighbouring tracker could not truthfully copy without changing
what it is:

- **It is honest about what it does not know.** A nutrient Open Food Facts has
  no value for is reported as missing, `partial · 3 of 7 foods`: never summed
  as zero. Every competitor quietly rounds absence down to nought, because a
  complete-looking number is easier to sell than a true one.
- **It never judges a body or a day.** No flame, no streak-at-risk
  notification, no per-food score, no "healthy" badge, no congratulation aimed
  at a body rather than an act. It shows the user their own numbers against
  their own targets and says nothing about what they should be. This is a fixed
  product rule, not a stylistic preference.

  **A streak is wanted and is not a violation of it.** The owner asked for one
  for both nutrition and training, and the line is not the count, it is the
  pressure. A number that says what happened is a fact; a flame, a countdown to
  losing it, or a notification about it is the app leaning on somebody, and
  those stay out. The streak is rendered in merit's own idiom, the mosaic strip
  and a mono line, never as a badge.

  Each domain counts its own behaviour. Nutrition counts days with food logged,
  because logging *is* the behaviour there. Training counts weeks in which the
  planned sessions happened, never days: a routine planned for Monday and
  Thursday cannot have a daily streak, and a correctly-taken rest day must never
  break anything.
- **The catalogue is shared and grows itself.** One person adding a product
  gives it to everyone in the group. A ten-person catalogue reaches usable
  coverage in weeks because the people using it are the people filling it.

## Operating Context

- **Phone first, and effectively phone only.** A desktop layout exists and is
  correct; nobody logs a set from a laptop.
- **Gym connections are bad.** Every write has to survive a slow round trip, and
  offline logging of sets is a planned requirement.
- **German and English are both first-class.** German runs 20–30% longer and is
  the language the group actually uses; it is the layout stress case, not the
  translation.
- **The day boundary is local, not UTC.** A meal logged at 23:30 belongs to that
  day.
- **Data comes from Open Food Facts (barcodes, ODbL, attribution required) and
  USDA FoodData Central (text search, CC0, via an Edge Function so the key never
  reaches the client).**

## Capabilities and Constraints

Shipping or in progress: invite-only auth; body weight logging; per-day, per-meal
food logging with calories and macros; barcode scanning through the phone
camera; an exercise catalogue; routines with per-set reps, scheduled into a
weekly pattern with per-date exceptions; set logging with reps, weight and
optional RIR; weight charts; German/English; light and dark.

Still to build for MVP: strength-progression charts, USDA text search, offline
set logging (Dexie/IndexedDB), the PWA manifest, and the legal set, privacy
policy, imprint, consent, JSON export, account deletion.

Deliberately out of scope, and future work must not add them: meal photos, meal
planning, coaching or AI suggestions, any dietary advice, public sign-up,
payments.

Terminology that has been argued over and settled: a reusable session is a
**routine**, never a "training day", you do not add a day, you add the thing
you do on it. A **session** is one instance of a routine on a date. Sets are
**planned** when a routine is started and **logged** when they are performed.

Technical constraints that bind design: Row Level Security on every user-scoped
table; no secrets in the client; no `localStorage` for application data; every
user-facing string through i18n with keys in both languages from the moment it
is written; 44px minimum touch targets; `dvh` never `vh`; 16px minimum font on
any mobile input, because iOS Safari zooms below that and `user-scalable=no` is
not an acceptable answer.

## Brand Commitments

- The product is **`merit`**, lowercase, everywhere it renders, including the
  document `<title>`. Capitalised only in legal text and the README, where it is
  a proper noun in someone else's sentence.
- The name is an acronym: **M**eals, **E**xercise, **R**eps, **I**ntake,
  **T**raining.
- **Moss green** is the brand colour and stays the brand colour.
- **Navigation and labels are lowercase.** Not Title Case anywhere in chrome.
- **Mono for anything machine-shaped**: numbers, units, counts, dates, labels.
  Tabular figures so values do not jitter as they change.
- **Voice:** direct, quiet, technically literate, second person. Complete
  sentences with real punctuation. Never an exclamation mark, never "Oops!",
  never an emoji in the interface, never generic reassurance copy.
- **Binding visual references supplied by the user:** MCI (Personal Training AI,
  German App Store) for its per-section colour identity, card language and
  chart-forward composition; Apple's own apps for structural discipline. Neither
  is to be cloned. MCI's streak flame and challenge gamification are
  specifically excluded by the no-judgement rule above.

## Evidence on Hand

- `docs/GOAL.md`: scope, users, data sources, schema intent, milestones.
- `CLAUDE.md`: working agreement, stack, hard rules.
- `DESIGN.md`: the incumbent visual system, being replaced.
- `e2e/shots/`: current-state captures of every screen, both themes, both
  languages, five widths.
- 34 seeded exercises in the database; a real Supabase project in the EU region;
  a live Vercel deployment.

Absent, and not to be fabricated: user testimonials, usage numbers, any claim
about competitors' accuracy beyond what is publicly documented, and any nutrition
or training authority. The app has no expert behind it and must never imply one.

## Product Principles

1. **Say what is true, including that something is unknown.** A missing value is
   reported as missing. A number that would be wrong is not shown.
2. **Never moralise.** The app reports; it does not praise, warn, or grade.
3. **The gym is the hard case.** Between sets, one hand, a bad connection, a few
   seconds of attention. A screen that works there works everywhere.
4. **German is the stress case.** If a layout survives German it survives.
5. **Own the data.** Self-hosted, exportable, deletable, no third party told
   anything it does not strictly need.

## Accessibility & Inclusion

WCAG AA contrast on all text. 44px minimum touch targets with 8px minimum
separation. `prefers-reduced-motion` honoured. No information carried by colour
alone. Every chart series and every state is distinguishable without hue.
Keyboard focus visible everywhere. Screen-reader labels on every icon-only
control, and on any figure a sighted user reads from a shape rather than from
text.

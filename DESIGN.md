# DESIGN.md — Merit

Merit's design language. It is the house style — same paper, same ink, same restraint, same voice as
NCLA — bent where a phone in a gym demands something a desktop tool does not.

**How to use this file.** It is binding. Where it contradicts a component library's defaults, this
file wins and the component gets overridden. Sections 1–17 are plain CSS and prose. The appendices
give the ready-made `tokens.css`, the shadcn bridge, the Tailwind v4 mapping, and the React
primitives.

**What is fixed and what is not.** The neutrals, the font families, the border-over-shadow rule, the
6px radius ceiling and the voice are fixed — those carry the signature across projects. The accent
hue, the layout and the component inventory are Merit's own.

**What changed relative to the desktop house style, and why.** Four things, each with a reason:

1. **The type scale moved up one step.** 14px body and 11px labels are right in a 1400px window and
   at the edge of legible on a 375px phone held at arm's length. More concretely: iOS Safari zooms
   the viewport whenever a focused input is under 16px, and Merit is an app you type numbers into
   all day.
2. **Touch targets replace mouse targets.** `10px 6px` on a nav item is a cursor affordance. Merit is
   operated one-handed, standing up, sometimes with chalk on your hands.
3. **Charts get a named exception to "no colour per category".** Three macros and two weight series
   need to be told apart. This is data visualisation, not decoration, and it is scoped.
4. **Responsiveness, two languages, offline and PWA are specified here.** The desktop house style had
   nothing to say about them because a fixed window never asks.

Everything else is carried over unchanged and deliberately so.

---

## 1. The signature in one paragraph

Warm paper in light, warm black in dark. Structure comes from 1px hairlines, never from shadows.
Nothing is rounder than 6px. One muted accent — moss green — spent only on the active thing, links,
the focus ring and a single left edge; everything else is greyscale, and importance is carried by
weight and emphasis instead of hue. Three typefaces with three jobs: sans for the interface, mono for
anything machine-shaped and for every small label, serif for the one sentence per screen worth
remembering. Text is small and dense, but never smaller than a thumb can hit or an eye can read at
arm's length. Lists are rows with a border, not grids of cards. Copy is lowercase in labels, complete
sentences elsewhere, honest about what is missing, and clear about where a number stands against its
target without moralising about it.

---

## 2. Colour

### 2.1 The eleven roles

Merit defines exactly these eleven and nothing else. The chart palette in §11 is the single scoped
exception, and it lives in its own namespace so it cannot leak into the interface.

| Role | Job |
|---|---|
| `bg` | The page itself. The largest area on screen. |
| `surface` | Anything raised out of the page: panels, rows, inputs, the bottom bar. |
| `surface-2` | The second plane — sidebar, table headers, hover fills, the scanner sheet. |
| `line` | Default hairline. Separates without being noticed. |
| `line-strong` | A hairline meant to be noticed: muted left edges, disabled marks, chart gridlines. |
| `ink` | Primary text. Also the "on" state of a value. |
| `ink-muted` | Body copy, secondary values, descriptions. |
| `ink-faint` | Labels, counters, metadata, placeholders, units. |
| `accent` | The single colour. Active nav, links, focus ring, the one value worth finding. |
| `accent-soft` | The accent's own background — active pills, selection, the tinted button. |
| `danger` | Destructive actions only. Never a judgement about food or a missed session. |

Two notes that matter more than they look:

- `ink-muted` and `ink-faint` are deliberately close. They are not "70% and 50%" — they are two nearly
  identical greys differing just enough to build a third level of hierarchy without a visible fourth
  colour.
- The page is the darkest surface in dark mode and the *second* lightest in light mode. Each plane
  lifts by only a few points (`#121212` → `#1a1a1a` → `#222220`). The separation comes from the
  hairline, not the step.

### 2.2 The fixed neutrals

Unchanged from the house style. Paper and ink, from the Vitesse lineage.

```css
/* Light */
--bg:          #fdfcf9;   /* warm paper, never pure white */
--surface:     #ffffff;
--surface-2:   #f4f1ea;
--line:        #e5e0d5;
--line-strong: #d5cdbd;
--ink:         #262521;   /* warm near-black, never #000 */
--ink-muted:   #6b6555;
--ink-faint:   #736c5c;
--danger:      #a33a2b;

/* Dark */
--bg:          #121212;
--surface:     #1a1a1a;
--surface-2:   #222220;
--line:        #2c2c29;
--line-strong: #3a3a36;
--ink:         #dbd7ca;   /* warm off-white, never #fff */
--ink-muted:   #a29c8b;
--ink-faint:   #979083;
--danger:      #cb7676;
```

Pure black and pure white appear nowhere.

### 2.3 The accent — Moss

Merit's accent is **Moss**, taken from the house palette. It reads calm and organic, suits a health
tool, and separates Merit from NCLA's ochre without leaving the family.

| | Light | Dark |
|---|---|---|
| `accent` | `#4f6b2c` | `#a8c27a` |
| `accent-soft` | `#eef2e2` | `#1b2113` |

Worst contrast ratio across all required pairs: **5.31:1**. Verified with the script in §16.3.

Moss is the only accent. No secondary accent, no success-green (the accent *is* green — a second
green would be indistinguishable), no info-blue. If a second colour feels necessary, the answer is
weight, emphasis, or an icon.

A note specific to this hue: because the accent is green, **green must not double as a
"target met" signal**. Not for ethical reasons but for legibility — if the accent means both "active"
and "on target", neither reading survives. Target status is carried by the bar, the emphasis and the
number itself (§10.9), and the accent goes on carrying the active thing.

### 2.4 Rules for spending colour

- **The accent is a highlight, not a theme.** Per screen: the active nav item, links, the focus ring,
  one left edge, one number worth finding. If a screenshot shows accent in a dozen places, the
  hierarchy has already failed.
- **No colour per category.** Meal types, muscle groups, exercises and food sources do not get hues.
  They are told apart by their name and their fixed position. The chart palette (§11) is the single
  scoped exception and never appears outside a chart.
- **`danger` is for destructive actions and for the single highest-severity mark.** Deleting a log,
  deleting an account — and, if the project decides so, a target overshoot large enough to be worth
  noticing. It is never a verdict on a food, and never used on a missed session.
- **No traffic light.** There is no green/amber/red scale: `danger` is one mark, not the top of a
  gradient, and the accent is already green (§2.3). Over, under and on target are told apart by the
  bar, by weight, and by `ink` versus `ink-faint`.
- **Never write a literal colour into a component.** Only token references. This is the rule that
  makes the second theme possible at all, and the one most likely to be broken in a hurry.

### 2.5 Theme mechanics

Two complete themes, three user preferences (`light | dark | system`), resolved to a `data-theme`
attribute on `<html>`.

```html
<!-- In <head>, before any stylesheet. Runs before the first paint. -->
<script>
  (function () {
    var theme = "light";
    try {
      var stored = localStorage.getItem("merit.theme");
      theme = stored === "light" || stored === "dark" ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } catch (e) { theme = "light"; }
    document.documentElement.dataset.theme = theme;
  })();
</script>
```

Non-negotiable details:

- **The bootstrap script is inline and duplicated from the theme module on purpose.** It cannot
  import anything — it has to run before the bundle exists. Without it every reload flashes the wrong
  theme, which is the single most obvious quality tell in a themed app. In an installed PWA opened
  from the home screen it is even more visible, because there is no browser chrome to distract from
  the flash.
- Define the light palette on bare `:root`. Redefine only the changed tokens under
  `:root[data-theme="dark"]`, and again under
  `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { … } }` so the page is
  correct before the script runs and with JS disabled.
- Set `color-scheme` in both blocks so form controls, scrollbars and the on-screen keyboard follow.
- When "system" is selected, listen to the media query and re-apply while the app is open.
- **Set `<meta name="theme-color">` per theme** and update it when the theme changes — it colours the
  status bar area of the installed PWA. A light status bar above a dark app is the PWA equivalent of
  the theme flash.
- Storage failures (private mode, blocked storage) must never prevent the theme from being applied.
  This is the one exception to Merit's "no `localStorage` for application data" rule (§15): the theme
  preference is chrome, not data, and it must be readable synchronously before paint.

---

## 3. shadcn/ui — how it fits

Merit uses shadcn/ui. This is deliberate and it does not weaken the house style, because shadcn is
not a component library in the usual sense: the components are **copied into `src/components/ui` and
owned by this repo**. Overriding them is the intended workflow, not a fight with a dependency.

What Merit takes from it: Radix behaviour — focus traps, roving tabindex, `aria-*` wiring, portals,
scroll locking, dismiss-on-escape, controlled/uncontrolled state. All the things that are tedious to
build, easy to build subtly wrong, and invisible until someone uses a screen reader or a keyboard.

What Merit does not take: its visual defaults. Those are replaced on the day each component is added.

### 3.1 The bridge, and two name collisions

shadcn styles itself through its own set of CSS variables. Merit defines the house tokens as the
source of truth and maps shadcn's names onto them in one place (Appendix B). No component ever
references a house token directly, and no house token is ever renamed to please shadcn.

Two mappings are counter-intuitive and cause real bugs when skipped:

- **shadcn's `--accent` is not the brand accent.** In shadcn it means "subtle hover fill" — what this
  document calls `surface-2`. Merit's brand accent maps to shadcn's `--primary`. Wiring
  `--accent → accent` produces a UI where every hover state is moss green.
- **shadcn's `--muted` is a background, `--muted-foreground` is text.** The house style's `ink-muted`
  is text. `--muted → surface-2` and `--muted-foreground → ink-muted`.

The rest is direct: `--background → bg`, `--foreground → ink`, `--card → surface`,
`--popover → surface`, `--border → line`, `--input → line`, `--ring → accent`,
`--destructive → danger`.

### 3.2 Overrides applied to every component on the day it is added

- **`--radius: 5px`.** shadcn ships `0.5rem`, and its `rounded-xl` on a button is a pill. Controls
  are tight; large surfaces take §6's larger radii.
- **Remove every shadow.** shadcn puts `shadow-sm` on cards, buttons and inputs. Structure comes from
  hairlines. Shadows survive only on true overlays — dialog, popover, dropdown, sheet — where an
  element genuinely floats above the page.
- **Re-map the size scale.** shadcn's `default` button is `h-9` with `text-sm` at Tailwind's 14px.
  Merit's `text-sm` is 13px and its minimum touch height is 44px. See §5.2 for the table.
- **Re-point the focus ring.** shadcn uses `ring-3` with an offset; Merit uses a 2px accent outline
  with 2px offset, defined once globally (§16.2).
- **Strip the font weights.** shadcn reaches for `font-bold` in places. Merit has 400, 500 and 600.

### 3.3 What Merit uses, and what it replaces

| shadcn component | Verdict |
|---|---|
| `dialog`, `sheet`, `drawer`, `popover`, `dropdown-menu`, `select`, `command` | Use. This is where the behaviour is worth the most. |
| `input`, `textarea`, `label`, `checkbox`, `switch`, `radio-group`, `slider` | Use, restyled per §10.5. |
| `toggle-group` | Use as the base for the segmented control (§10.7), `type="single"`. Restyle completely. |
| `tabs` | **Do not use** as a segmented control. `tablist`/`tab` promises panels a settings toggle does not have. Available if a screen ever genuinely switches panels. |
| `button` | Use as the base, but replace the variant set with Merit's four (§10.4). Delete the ones that do not exist here. |
| `sonner` (toasts) | Use sparingly. Merit prefers in-place state to notifications. |
| `calendar` | Use for the date picker; restyle heavily, it is the most opinionated component in the set. |
| `card` | **Do not use.** Merit's `Panel` (§10.2) is six lines and shadow-free by construction. |
| `accordion`, `collapsible` | **Do not use on a logging screen** (§7). On a browse or catalogue screen, use — expanded by default, and remember what the reader collapsed (§10.11). |
| `alert`, `badge` | **Do not use.** Merit has `Chip` (§10.6) and plain prose. |
| `table` | **Do not use below `md`.** Merit's `Rows` (§10.1) is the list primitive; tables are a desktop affordance only. |
| `avatar`, `carousel`, `breadcrumb` | Not needed. Do not add speculatively. |

A component is added when a screen needs it, never in advance. `npx shadcn@latest add <name>`, then
apply §3.2 before the first commit that uses it — restyling later means finding every instance.

---

## 4. Typography

### 4.1 Three families, three jobs

IBM Plex, bundled from npm — never a CDN, never a `<link>` to a font host. A PWA that has to reach a
font host is not offline-capable.

```
@fontsource-variable/ibm-plex-sans   → --font-sans
@fontsource/ibm-plex-mono            → --font-mono   (400 + 500 only)
@fontsource/ibm-plex-serif           → --font-serif  (400 only)
```

```css
--font-sans:  "IBM Plex Sans Variable", ui-sans-serif, system-ui, sans-serif;
--font-mono:  "IBM Plex Mono", ui-monospace, "Cascadia Code", Consolas, monospace;
--font-serif: "IBM Plex Serif", ui-serif, Georgia, serif;
```

Import only the weights actually used, and subset to latin — three families is already a lot of bytes
over a phone connection.

**Sans** is the interface: body text, headings, buttons, navigation.

**Mono means something.** It marks anything machine-shaped or countable, which in Merit is a great
deal: every gram, kilogram, kilocalorie, rep count, set number, RIR value, barcode, date, time,
duration, and **every short section label**. The rule: if a human wrote it as prose, it is not mono.
A food name is sans. `183 g` is mono.

**A label long enough to truncate is sans, and may wrap.** Mono is wider per character than sans at
the same size, so a long compound — `davon gesättigte fettsäuren` is the app's worst case, and it did
truncate — loses its ending in a font chosen for the numbers beside it. The label is the part that
says what the number *is*; losing its ending to a font choice is the wrong trade. Short structural
labels stay mono, which is nearly all of them.

**Serif is the voice.** Exactly one kind of sentence per screen gets it: the single line worth
remembering. In Merit that is the dashboard's one-line statement about the day, and nothing else. Not
in body copy, not in labels, not in empty states.

**Numbers use tabular figures.** `font-variant-numeric: tabular-nums` on every changing value —
remaining calories, a weight in a set row, a chart axis. Without it the dashboard jitters as you
type.

### 4.2 The scale

One step up from the desktop house style, for the reasons in the preamble. Still dense, still
deliberately smaller than framework defaults.

| Token | Size | Used for |
|---|---|---|
| `text-2xs` | 12px / 0.75rem | Labels, counters, units, chips, keyboard hints |
| `text-xs` | 13px / 0.8125rem | Tight secondary metadata |
| `text-sm` | 14px / 0.875rem | Secondary UI text, table cells, descriptions |
| `text-base` | 15px / 0.9375rem | **The interface default.** `<body>` is set to this |
| `text-input` | 16px / 1rem | **Every text and number input on mobile. Non-negotiable.** |
| `text-prose` | 16px / 1rem | Long-form reading copy (privacy policy, imprint) |
| `text-lg` | 18px / 1.125rem | Sub-headings, the serif statement, wordmark |
| `text-xl` | 22px / 1.375rem | Page titles (`h1`) |
| `text-2xl` | 28px / 1.75rem | The dashboard's primary number. The in-app ceiling |
| `text-3xl` | 34px / 2.125rem | Reserved: the single remaining-calories figure, mobile only |

`text-2xs` at 12px does the heavy lifting and is the size most often got wrong. It is small on
purpose, it is always mono, and it is nearly always `ink-faint`.

**`text-input` exists for one reason.** iOS Safari zooms the viewport when a focused input computes
below 16px, and no `user-scalable=no` should ever be used to suppress that — it breaks pinch-zoom for
everyone who needs it. Every `<input>`, `<textarea>` and `<select>` is `text-input` below `md`. It
may drop to `text-sm` from `md` up, where there is no mobile Safari.

### 4.3 Weight, line height, measure

- **Weights: 400, 500, 600.** Nothing else. 600 for `h1`, the wordmark and the dashboard's primary
  number; 500 for the active nav item, buttons, and a value that must win against its neighbours; 400
  for everything else. There is no 700.
- **Tracking:** `tracking-tight` on headings 18px and up. `tracking-wide` on some mono labels. Never
  `uppercase tracking-widest` as a section label.
- **Line heights:** interface 1.5 · long-form prose 1.7 · the serif statement snug (~1.3) · a stacked
  number-and-unit pair 1.1.
- **Measure:** cap every column of running text. `~62ch` for the serif statement, `~64–68ch` for a
  page lead, `~72–76ch` for body copy. On a phone the viewport caps it anyway; the rule exists for
  the `lg` layout.
- `text-balance` on headings and leads.

### 4.4 Casing

Section labels are **lowercase or sentence case in mono**, small and faint. Small caps and
all-uppercase wide tracking are both out. Where uppercase appears it is on a mono label at 12px with
normal tracking — a technical marker, not a decorative one.

**Navigation, labels and the product name are lowercase.** `merit` · `nutrition` · `training` ·
`settings` · `today` · `last session`. Not `Merit`, not `Nutrition`, not Title Case anywhere in
chrome. Sentence case is for prose — a full sentence starts with a capital and ends with a full stop.
A nav item is not a sentence.

This applies to the wordmark too: the app is `merit`, lowercase, in every place it renders —
including the `<title>`, which is the first piece of the brand anybody sees and had no business
disagreeing with the wordmark two centimetres below it. `Merit` appears capitalised only in legal
text and the README, where it is a proper noun in someone else's sentence rather than a piece of
this interface.

Units are lowercase and follow SI: `g`, `kg`, `ml`, `kcal`, `cm`. Never `Kcal`, never `KG`. A unit is
always mono, always `ink-faint`, and always separated from its number by a space — never glued on.

---

## 5. Space

### 5.1 The scale

A 4px grid, with 2px at the very smallest end.

```
2 · 4 · 6 · 8 · 10 · 12 · 14 · 16 · 20 · 24 · 32 · 36 · 40 · 48 · 64 · 80 · 96 · 112
```

Anything not on this list is a mistake or needs a comment explaining the optical correction.

### 5.2 Padding recipes, and the 44px floor

**Every interactive element is at least 44×44px on touch.** Where the visual box is smaller than
that, the *hit area* is enlarged with padding or a pseudo-element — the design does not grow, the
target does.

| Container | Mobile | `md` and up |
|---|---|---|
| Chip / pill (non-interactive) | `4px 10px` | `2px 8px` |
| Chip / pill (interactive) | `10px 12px`, min-h 44 | `6px 10px` |
| Icon-only button | `12px`, min 44×44 | `8px`, min 32×32 |
| Nav item (bottom bar) | full cell, min-h 52 | `8px 10px` |
| Button, standard | `12px 18px`, min-h 44 | `8px 14px`, min-h 36 |
| Button, small | `10px 14px`, min-h 44 | `6px 10px`, min-h 30 |
| Input | `12px 14px`, min-h 44 | `8px 12px`, min-h 36 |
| Row inside a list | `12px 16px`, min-h 52 | `10px 16px` |
| Panel field / body | `14px 16px` | `12px 16px` |
| Panel header strip | `10px 16px` | `8px 14px` |
| Page content area | `16px` horizontal, `20px` top | `24px`, and **no more than 24px** at `lg` |

The gap between two adjacent touch targets is at least 8px. A delete button 2px from a value field is
a mis-tap waiting to happen, and in Merit a mis-tap deletes a logged meal.

### 5.3 Vertical rhythm

- **32px (`mb-8`)** between sections on the dashboard.
- **24px (`mb-6`)** between sections inside a logging flow — tighter, because the screen is a task.
- **36px (`mb-9`)** between sections of a long-form document (privacy policy, imprint).
- **24–32px** below a page header.
- **12px** between a section head and its content.
- **8px** between a label and its value.

Pick one rhythm per page type and hold it.

### 5.4 Widths

| Thing | Width |
|---|---|
| Bottom navigation bar | full width, height 56 + safe-area inset |
| Sidebar (`lg` and up) | 240px |
| Bottom sheet | full width, max-h 85dvh |
| Content column, dashboard | ~860px, centred |
| Content column, reading | 72–76ch |
| Modal dialog (`md` and up) | 420–520px |

**A wide screen is not an invitation to add whitespace.** Merit is a dense tool; on a 1440px display
the content column is capped and *centred*, with 24px gutters — the extra width becomes empty page,
not extra padding inside panels. Row padding, panel padding and the gap between sections stay within
a step or two of their mobile values. Interfaces that scale their own padding with the viewport are
the single most reliable tell of a generated layout: everything breathes uniformly and nothing has a
hierarchy. Density is the signature; keep it at every width.

---

## 6. Surface, border, radius, elevation

**Borders instead of shadows.** 1px hairlines in `line` define every boundary: panels, rows, inputs,
the bottom bar, the sidebar edge. Shadows exist only on things that genuinely float: dialog, popover,
dropdown, bottom sheet. A shadowed card grid is the clearest sign the language has been abandoned —
and it is exactly what shadcn ships by default, so §3.2 is not optional.

**Radius scales with the size of the thing:**

```css
--radius-sm: 3px;   /* inline code, chart cells, tiny marks */
--radius-md: 5px;   /* buttons, inputs, chips, nav items */
--radius-lg: 10px;  /* panels, row lists, cards */
--radius-xl: 14px;  /* bottom sheets and dialogs */
```

The old ceiling was 6px on everything, inherited from a desktop editor where every surface is a
panel a few pixels from its neighbour. It does not survive the move to a phone: a full-width bottom
sheet with 6px corners reads as a web page that failed to load its styling, not as a tight interface,
because every sheet the reader has ever pulled up on that device is rounder. A control stays tight —
a 5px button is right and a 12px one is a pill in disguise — but a large surface takes a larger
radius, which is the same rule the ceiling was reaching for, applied proportionally.

Still no pills. `border-radius: 9999px` is allowed for exactly two things: a thin progress track, and
the drag handle of a bottom sheet. A fully rounded button is toy UI at any size.

**Elevation without shadow.**

```
bg            the page
└ surface     a panel sitting on it, bordered in line
  └ surface-2 a nested plane: panel header, hover fill, the scanner viewport frame
```

**Hover and press.** Rows fill with `surface-2` on hover. On touch there is no hover, so **every row
and button needs a visible `:active` state** — `surface-2` fill, applied instantly, no transition.
Without it a tap on a slow connection feels like nothing happened and gets repeated. Nothing scales,
nothing lifts, nothing casts a shadow.

**Dividers.** Inside a list, `divide-y divide-line` on the container, not a border on each child.

**The accent edge.** The signature element: `border-left: 2px solid var(--accent)` with
`padding: 4px 0 4px 16px` and no background. In Merit it marks the dashboard's one statement about
the day. Its muted twin uses `line-strong` and marks something provisional or not yet built. Two
accent edges on one screen cancel out.

---

## 7. Layout and navigation

- **One route, one file.** No module that renders three screens.
- **Components grouped by role, not by type**: `shell/`, `features/<domain>/`, `ui/` for the
  cross-cutting primitives and the shadcn components. Not a flat `components/` folder with forty
  files.
- **Navigation is a bottom tab bar below `lg`, a sidebar from `lg` up.** Same routes, same labels, one
  component that switches on the breakpoint. Four tabs at most: dashboard, food, training, more.
  A fifth tab means the information architecture is wrong.
- **The bottom bar is `surface` with a `border-t` in `line`**, plus `padding-bottom:
  env(safe-area-inset-bottom)`. Not translucent, not blurred, not floating — it is a plane, and it
  must stay legible over a scrolling chart.
- **From `lg`, the header carries a path bar**, not a page title. Mono `text-2xs`, `ink-faint`, with
  the current segment promoted to `ink`, separated by a thin `/` in `line-strong`:
  `merit / nutrition / today`. It sits in the sticky header, left-aligned to the content column, and
  it is the same lowercase vocabulary as the navigation (§4.4). Segments before the last are links.

  This is a carried-over signature, not decoration: the file-tree reading is what makes the app feel
  like a tool rather than a dashboard template. Below `lg` it is replaced by a single mono label for
  the current screen — a three-segment path on a 375px screen is noise.

- **Sticky chrome is thin**: a header of `border-b` + `bg/90` + `backdrop-blur`, never an opaque bar
  with a shadow.
- **The primary action of a screen sits in its lower half** on mobile. The top of a phone screen is
  the hardest place to reach one-handed, and Merit is used one-handed.
- **Do not animate a grid-template change.** `grid-template-columns` is not interpolable; a
  transition on it flips late and reads as lag.
- **A logging screen never hides content.** No accordion, no tab strip, no "show more" on a screen
  someone opened because they are standing between sets holding a phone. An extra tap there is real
  damage, and the set form, the day's totals and the comparison line are all on screen at once.

  **This is a rule about logging, not about every screen.** It was written with one screen in mind
  and its own justification says so. A screen whose job is *finding* something among many — the
  exercise catalogue, the food catalogue, a long log — has the opposite need: structure is the point
  there, and a flat list of two hundred rows with a search box is the worse interface. Those screens
  are governed by §10.11, which requires grouping and filtering and permits collapsing, and which
  forbids the thing this rule was actually protecting against: content hidden *by default*.

  The test is what the person came to do. Acting on something already decided → show everything.
  Looking for one thing among many → help them narrow it.
- **Four tabs, and everything else lives under `more` — so `more` is grouped, never a flat list.**
  The ceiling is real and worth keeping, but it makes one screen the home of weight, goals, settings,
  export and the legal pages, and a flat list of those is the junk drawer the ceiling was avoiding.
  Sections with §10.3 heads, ordered by how often they are opened, daily things first.

- **Prose belongs in Markdown; data belongs in TypeScript.** The exercise catalogue, the meal types
  and the activity-level factors are typed data modules with a single source, not content authored
  twice.

---

## 8. Responsive rules

The house style had nothing to say here because a fixed desktop window never asks. Merit's primary
target is a phone.

**Breakpoints** — Tailwind defaults, used deliberately:

| | Width | What it is |
|---|---|---|
| base | 0–767px | Phone. **Design here first, always.** |
| `md` | 768px | Tablet, small laptop window |
| `lg` | 1024px | Laptop and up. Sidebar appears |

**Design every screen at 375px first, then widen.** Not the other way round. A layout designed at
1280px and squeezed down produces the horizontal scroll, the truncated button and the 32px touch
target that this section exists to prevent.

- **No horizontal scrolling, ever**, except inside a chart that explicitly supports it and says so.
- **Tables become stacked rows below `md`.** Never shrink a table to fit. The set-logging view is the
  test case: on desktop it is a table of sets; on a phone it is a stack of rows.
- **Forms are single-column below `md`**, at most two columns above.
- **Modals become bottom sheets below `md`.** A centred dialog on a phone puts its actions under the
  thumb of nobody. Use shadcn's `drawer`/`sheet` below `md` and `dialog` above, behind one wrapper
  component so call sites do not branch.
- **Safe areas are respected on all four edges** — `env(safe-area-inset-*)`. The installed PWA has no
  browser chrome to absorb the notch or the home indicator.
- **Use `dvh`, not `vh`.** Mobile browser chrome changes height as you scroll; `100vh` produces a
  layout that is cut off exactly when the keyboard is open.
- **Numeric inputs set `inputMode`**: `decimal` for weights and portions, `numeric` for reps and
  integers. Never `type="number"` alone — it brings spinner arrows nobody can hit and rejects commas,
  which is how half of Europe writes a decimal.
- **The on-screen keyboard must never cover the field being typed into.** Test every logging form
  with the keyboard open; scroll the focused field into view.
- **Charts get a readable state at 375px.** If a chart does not fit, simplify it — fewer ticks, fewer
  series, a shorter range. Never shrink it.
- **Test in German.** See §9.

---

## 9. Bilingual UI

Merit ships German and English. Every user-facing string goes through i18n from the moment it is
written; there is no "add translations later" phase, because retrofitting means finding every string
in the codebase.

- **German runs 20–30% longer than English.** Never size a component to fit its English label.
  `Trainingseinheit hinzufügen` against `Add session` is the normal case, not the worst one.
- **Buttons and tabs must not truncate.** Allow wrapping to two lines, or reserve width for the long
  form. A bottom-nav label that fits `Food` and clips `Ernährung` is a bug.
- **Test every screen in German at 375px.** That combination is where layouts break, and it is the
  combination the author actually uses.
- **Dates, numbers and units are formatted with `Intl`**, using the active locale. `1.234,5` in
  German, `1,234.5` in English. Never hand-format a number.
- **Units stay metric in both languages** — kg, g, ml, cm, kcal. The English UI is for
  English-speaking friends in Germany, not for the US.
- **Decimal input accepts both `.` and `,`** and normalises on parse. Somebody will type `82,4`.
- **Never concatenate translated fragments.** Use interpolation with named variables, so word order
  can differ between languages.
- **Plurals go through the i18n plural rules**, not an `n === 1 ? … : …` in a component.

---

## 10. Components

The standard set. Building them the same way each time is most of the recognisability. Where a
shadcn component is the base, that is noted.

### 10.1 Rows — the default list

Lists are bordered rows, never a grid of cards. One container with a border and radius, dividers
between children, `surface-2` on hover and on `:active`.

```
┌────────────────────────────────────────────────┐
│ Skyr, natur                    180 g   107 kcal│  ← min-h 52, px 16, py 12
├────────────────────────────────────────────────┤
│ Haferflocken                    60 g   227 kcal│
└────────────────────────────────────────────────┘
```

Row anatomy, left to right: an optional fixed-width mono marker in `ink-faint`, a flexible truncating
name in sans, right-aligned mono metadata that never wraps. Fixed-width leading and trailing columns
are what make the numbers line up, which is the difference between a list you scan and a list you
read.

**Destructive actions live behind a swipe or a long-press, never as a visible icon in the row.** A
delete button 8px from a value in a 52px row will be hit by accident. Deleting always offers an undo
(§14).

### 10.2 Panel and Field

A `Panel` is a bordered `surface` container with radius 6 and no shadow. A `Field` is one row inside
it: `border-top` (suppressed on the first), a mono `text-2xs` label in `ink-faint`, and the value 8px
below at `text-sm`. Stacked fields make a metadata rail without a single shadow or heading.

Merit does not use shadcn's `card`. `Panel` is six lines and shadow-free by construction.

### 10.3 Section head

```
label in mono 12px, ink-faint              optional action →
──────────────────────────────────────────────────────────  ← border-b line, 8px above
```

Baseline-aligned, 12px of space below the rule. Appears on nearly every screen.

### 10.4 Buttons — four kinds and no more

Base: shadcn `button`, with its variant set replaced by these four. Delete the shadcn variants that
do not appear here rather than leaving them unused.

| Kind | Style | Use |
|---|---|---|
| **Primary** | `bg-accent`, text in `bg`, radius 5, weight 500, hover `opacity .9` | One per screen at most |
| **Tinted** | `border-accent`, `bg-accent-soft`, text `accent`; hover inverts to `bg-accent` + text `bg` | The important-but-not-only action |
| **Quiet** | `border-line`, text `ink`; hover `border-line-strong` | Secondary action |
| **Bare** | No border, text `ink-muted`; hover `surface` fill + `ink` | Icon buttons, toolbars, toggles |

Sizes come from §5.2, not from shadcn's `h-9`/`h-8`/`h-10`. Disabled is `opacity: .35` and no hover.
Icons sit *after* the label for forward motion (`→`), *before* for a mode or state, at 15–16px with
`gap: 8px`.

**A button that writes to the database has a pending state** and is disabled while pending. On a
phone connection the gap between tap and confirmation is long enough to tap twice.

### 10.5 Inputs

Base: shadcn `input` / `textarea`, restyled.

`border-line`, `bg-surface` (or `bg` when already on a surface), radius 5, padding per §5.2,
**`text-input` (16px) below `md`**, placeholder in `ink-faint`. Focus: `border-color: accent` and the
global focus ring. A leading icon sits absolutely at `left: 12px`, 15px, `pointer-events: none`, and
the input takes 36px of left padding.

Textareas: `resize-y`, 2–3 rows, **save on blur, not on keystroke**.

**The number field is Merit's most-used control and gets its own treatment.** A weight, a portion, a
rep count: mono, tabular figures, right-aligned, with the unit as a static `ink-faint` mono suffix
inside the field rather than as a separate label. Where a value has a natural step (reps, sets), pair
it with two 44px `Bare` buttons for −/+; typing must still work.

### 10.6 Chips and labels

A chip is a mono `text-2xs` pill: `border-line`, `bg-surface-2`, `text-ink-muted`, radius 5. Linked
chips gain `border-line-strong` and `text-ink` on hover. Chips never carry a category colour — a
`community` source chip and an `off` source chip look identical apart from their text.

A label is mono `text-2xs`, `ink-faint`, optionally uppercase, never wide tracking.

### 10.7 Segmented control

Base: shadcn `toggle-group` with `type="single"`, restyled to a single bordered container with
`overflow: hidden` and radius 5; children are flush buttons with no borders of their own. Active:
`bg-accent-soft` + `text-accent`. Inactive: `ink-faint`, hover `surface` + `ink`. Used for theme,
meal type, chart range, and any 2–4 way exclusive choice.

**It is a radio group, not a row of toggles.** `role="radiogroup"` with an `aria-label`, each option
`role="radio"` with `aria-checked` — which is what `toggle-group type="single"` renders, so it comes
for free along with arrow-key roving focus. This replaces an earlier `role="group"` + `aria-pressed`
spec, and the distinction is not pedantry: `aria-pressed` describes buttons that happen to be
mutually exclusive, so a screen reader announces three independent toggles and leaves the user to
infer that exactly one can win. `radiogroup` announces "2 of 3" and makes the exclusivity part of
what is read out. Selecting the active option again must not clear it — a segmented control has no
empty state.

Above four options it becomes a `select`. A five-segment control on a 375px screen has 60px segments.

### 10.8 Empty, unfinished, offline and missing states

These carry a surprising amount of the personality.

- **Empty list**: one centred line, `text-sm`, `ink-muted`, inside the bordered container that would
  have held the rows. Not an illustration, not a call to action. `nothing logged yet`.
- **Nothing here yet**: mono `text-2xs`, `ink-faint`, in place.
- **Not built yet**: the muted accent edge (`line-strong`) with a mono label naming the milestone and
  one sentence saying what will go there.
- **Offline**: a mono `text-2xs` line in the header, `ink-faint`, stating the fact and the
  consequence — `offline · sets are saved on this device`. Not a banner, not a toast, not a modal.
  It disappears when the connection returns and the queue is empty.
- **Pending sync**: the same treatment with a count — `3 sets waiting to sync`. Never a spinner that
  never resolves.
- **A lookup that found nothing**: say so in the space it would occupy, and offer the next step
  inline — `no product for this barcode · add it yourself`. This is the most important empty state in
  the app; it is the path by which the shared catalogue grows.

### 10.9 Progress

A 3px track, `bg-line`, fully rounded, with an `accent` fill. Below it a mono `text-2xs` count in
`ink-faint` with the significant number promoted to `ink`: `<span class="ink">1420</span> / 2100
kcal`. That promotion of one number inside a faint line is a recurring move.

**Exceeding the target must be obvious at a glance.** The bar does not stop at 100%: past the target
it keeps filling in `danger` from the target mark rightwards, with a 1px `line-strong` tick left
standing at the 100% position so the overshoot is measurable rather than just red. The number beneath
switches from `remaining` to `over` and promotes the significant figure to `ink` at weight 500:
`<span>2380</span> / 2100 kcal · 280 over`.

Undershooting is the same mechanism in reverse and deliberately quieter: the bar simply is not full,
and the line reads `680 left`. A day in progress is not a failed day, and the dashboard is looked at
mid-afternoon more often than at midnight.

### 10.10 Merit-specific components

- **Day summary** — the dashboard's top block, inside one `Panel`.

  **The calorie ring.** A sum against a target is a ring, not a bar: an SVG circle, 8px stroke,
  `line` track, `accent` fill, starting at 12 o'clock and running clockwise. The remaining figure
  sits centred inside at `text-3xl`, mono, tabular, with its unit beneath in `ink-faint`. Past the
  target the ring keeps going into a second lap drawn in `danger` over the first, with the 100%
  position marked by a 2px `bg`-coloured gap so the overshoot stays measurable (§10.9). The ring is
  `role="img"` with the same figures as its `aria-label` — a ring is unreadable to a screen reader
  otherwise.

- **Nutrient panel** — everything below the ring, as `Rows` in **EU label order**, so the screen
  matches the packaging that was just scanned:

  ```
  fat                    62 g  ▓▓▓▓▓▓▓▓░░░░
    of which saturates   19 g  ▓▓▓▓▓▓▓▓▓▓▓▓   limit
  carbohydrate          210 g  ▓▓▓▓▓▓▓▓▓░░░
    of which sugars       48 g  ▓▓▓▓▓▓▓░░░░░   limit
  fibre                  21 g  ▓▓▓▓▓▓▓░░░░░
  protein               142 g  ▓▓▓▓▓▓▓▓▓▓░░
  salt                  4.1 g  ▓▓▓▓▓▓▓▓░░░░   limit
  ```

  Rules for it:

  - **No colour per nutrient.** Every bar is `accent` on a `line` track, 3px, full width of its
    column. The nutrients are told apart by their label and their fixed position, which is the same
    reason a file tree works.
  - **Sub-values are indented one step and set in `ink-muted`**, never promoted to their own row.
    `of which sugars` is part of carbohydrate, and a flat list of seven equals loses that.
  - **Targets and limits behave differently and must look different.** Protein, fibre and
    carbohydrate are targets to reach: the bar fills toward `accent` and a full bar is the point.
    Sugars, saturates and salt are ceilings: their track carries a 1px `line-strong` tick at the
    limit, and past it the bar continues in `danger`. A limit row carries a mono `text-2xs` `limit`
    marker in `ink-faint` so the two kinds are distinguishable without reading the values.
  - **A nutrient with no data is not a zero.** If Open Food Facts has no fibre value for half the
    day's foods, the row says `partial · 3 of 7 foods` in `ink-faint` rather than displaying a number
    that is wrong. Silently summing missing values as zero is the most misleading thing this panel
    could do.
  - **Only calories, protein, fat and carbohydrate have user-set targets.** Fibre, sugars, saturates
    and salt use reference values with their source named in settings, and any of them can be
    switched off entirely — most people do not want seven bars every morning. Default on: calories,
    protein, fat, carbohydrate. Default off: the rest.

- **Macro split ring** — the one place colour distinguishes nutrients, because there they are parts
  of one sum rather than entries in a list: an optional second, thinner ring inside the calorie ring,
  or a separate donut, splitting the day's energy across protein / fat / carbohydrate in
  `--chart-1..3`. Never more than three segments; sugars and saturates are not separate energy
  sources and do not belong in it.

- **Consistency heatmap** — the GitHub-style overview, one cell per day, weeks as columns. Cells are
  7×18px with a 2px gap and a 1px radius, grouped by month with a mono numeral beneath each cluster.

  Three states, and they are **told apart by fill density, not by hue**:

  | State | Fill |
  |---|---|
  | not tracked | `line` |
  | tracked, outside the target band | `accent` at 45% opacity |
  | tracked, within the target band | `accent`, full |

  The target band is configurable and defaults to ±20% of the calorie target. Why opacity rather
  than grey/amber/green: the accent is already green (§2.3), and amber against green is the single
  worst pair for the ~8% of men with a red-green deficiency — in a group of ten that is not a
  hypothetical. If a hue variant is wanted anyway, the middle state must additionally differ in
  form — an outlined cell rather than a filled one — so the information survives without colour.

  The whole cluster is one link with a `title` and an `aria-label` spelling out what the cells
  encode, and each cell has its own date and value in a `title`.

- **Quick-add row** — recently used and favourite foods as a horizontally scrollable strip of chips
  above the day's list. One tap re-logs yesterday's breakfast. This is the single feature that
  decides whether the app gets used daily, and it deserves the position it takes.
- **Set row** — exercise name, then a mono line of `set · reps · weight · rir`. Below it, in
  `text-2xs` `ink-faint`, last session's figures for the same exercise. That comparison line is the
  reason anyone opens the training tab between sets; it is not optional detail.
- **Scanner viewport** — full-bleed camera feed with a `surface-2` frame at 6px radius, a single
  centred reticle drawn in `line-strong`, and one mono line of instruction beneath. No overlay
  animation, no scanning laser. On failure it falls through to manual entry in the same sheet, not on
  a different screen.
- **Rest-day / next-session line** — one sentence, sans, `ink-muted`, on the dashboard, naming when
  the next session is due.
- **Streak / consistency mark** — a mono `text-2xs` line with the significant number promoted to
  `ink`: `4 weeks · 3 sessions each`. Rendered as text and, where it earns the space, as a dense
  strip of small hard-edged cells (7×18px, 2px gap, 1px radius, filled in `accent`, empty in `line`)
  — the mosaic pattern from the house style, one cell per day or per session.

  Two constraints on it, both practical rather than moral. **Count sessions, not logging.** A streak
  that breaks because somebody forgot to log a lunch punishes the record-keeping, not the behaviour,
  and the usual response to a broken streak is to stop opening the app. **Never a flame, never a
  countdown to losing it, never a notification about it.** The mark states a fact about what
  happened; it does not apply pressure about tomorrow.

---

### 10.11 Finding things in a long list

Merit has two catalogues that everybody adds to, so both get longer every week and neither can be
browsed as a flat list for long. This section is what §7 hands those screens instead of its
no-hiding rule.

**Filter chips, not a select.** §10.6's chip, made pressable: `border-line` / `bg-surface-2` /
`ink-muted` at rest, `border-accent` / `bg-accent-soft` / `text-accent` when active, in a wrapping
row above the list. Multi-select within a facet, union within it and intersection across facets —
picking `chest` and `back` shows both; picking `chest` and `barbell` shows the overlap. A `select`
hides the options until tapped, allows one, and hides the current state behind a closed control;
none of that is what filtering wants. §10.7's "above four options it becomes a select" governs a
single-choice *setting*, not a filter.

The active count is visible without opening anything, and there is always a way back to everything —
a `clear` chip that appears only when something is filtered, never a permanently disabled control.

**Grouping is structure, not decoration.** Results in a long list are grouped under §10.3 heads —
muscle group for exercises, meal for a day's food. A group states how many rows it holds, in mono
`text-2xs`, because that is the number that tells a reader whether to bother opening it.

**Disclosure, and the one rule that matters about it.** Every group can be collapsed and **every
group starts open.** Content collapsed by default is the anti-pattern (§17); a section that opens
expanded and can be folded away is a control the reader is given, which is the opposite. What the
reader collapses is remembered for that screen, because a section folded away and re-opened by the
app on the next visit is not a control, it is a suggestion.

The header is a button: `aria-expanded`, the chevron rotating 150ms, the panel animating its own
height over the same 150ms (§13). No cross-fade, no slide.

**Recently used comes first and is never filtered away.** On a screen whose job is picking, the
answer is usually something picked before. That group sits above the facets and above the search
field, it ignores whatever filters are set, and it is the one group allowed to be short.

**Search narrows, it does not replace.** The field filters the same grouped, faceted list rather
than swapping it for a flat set of results — otherwise typing one letter destroys the structure the
rest of this section built, and clearing it rebuilds a screen the reader has to re-orient in.

**An empty result names the way out.** Not `no results`, but which filter is responsible and how to
drop it — and, where the catalogue is one everybody extends, the offer to add the missing thing
(§10.8). That is the path by which both catalogues grow.

---

## 11. Charts and data visualisation

The house style is comfortable with dense information, and Merit is mostly numbers over time.

**Recharts, rendering SVG.** Diagrams are DOM: inspectable, accessible, scalable, theme-aware for
free and diffable in review. No canvas.

**Colour in charts comes from a scoped palette** (`--chart-*`), defined in `tokens.css`, referenced
only inside chart components. This is the single exception to §2.4, and it is scoped precisely so it
cannot leak into the interface. Axis lines and gridlines use `line-strong`; labels use `ink-faint`;
the emphasised series uses `accent`.

The palette is five entries, ordered, and each is distinguishable in greyscale:

| Slot | Meaning in Merit |
|---|---|
| `--chart-1` | Protein, in the macro split ring |
| `--chart-2` | Fat, in the macro split ring |
| `--chart-3` | Carbohydrate, in the macro split ring |
| `--chart-4` | Weight, raw daily values |
| `--chart-5` | Weight, 7-day rolling average |

Slots 1–3 exist for exactly one figure: the macro split, where three values compose one sum. They do
**not** apply to the nutrient panel (§10.10), where seven values form a list and colour would be
noise. Sugars, saturates, fibre and salt have no chart colour at all — if a nutrient needs its own
line chart later, it is drawn in `accent` against `line` gridlines like every other single series.

**Never encode meaning in colour alone.** Every series carries a label, and the two weight series
differ additionally in stroke: raw is a thin 1px line with dots at `opacity .5`, the average is 2px
and solid. That difference survives a greyscale printout and a colour-blind reader.

- **Default range 30 days**, with 7 / 30 / 90 / all as a segmented control.
- **Axes are labelled with units.** `kg`, `kcal`. An unlabelled axis is a guess.
- **Y-axis on a weight chart never starts at zero.** It would flatten the only signal there is.
  A calorie bar chart always does start at zero.
- **Empty state names the action**, not the absence: `log a weight to see the trend`.
- **Tooltips are touch-first**: tap to pin, tap elsewhere to dismiss. A hover-only tooltip is
  unreachable on the primary target device.
- **Gaps in data are gaps**, not interpolated straight lines. A week of missed weigh-ins should look
  like a week of missed weigh-ins.
- Every chart gets `role="img"` and an `aria-label` stating what it shows and its current range, plus
  a visually hidden table of the underlying values for screen readers.

---

## 12. Icons

- **Lucide only.** Tree-shakeable, bundled, no runtime fetch.
- **Size 16–18px on mobile chrome**, 14–15px from `md` up, 12–13px inline next to `text-2xs`.
- **`strokeWidth={1.75}`** by default; `2` for chevrons and arrows that must stay legible small.
- Icons are `shrink-0` in flex rows, and `aria-hidden` unless they are the button's only label — in
  which case the button needs an `aria-label` and a visually hidden text label.
- **Never a character as an icon.** No `▸`, no `✓`, no emoji standing in for a glyph. The permitted
  exceptions are typographic characters used as *text*: the `·` separator, `→` and `↗` inside a
  link's own label.
- **No icon carries meaning alone in the navigation.** Bottom-bar tabs have icon *and* label. An
  icon-only tab bar is a guessing game in a second language.

---

## 13. Motion

Motion is feedback. It confirms something happened; it never announces, decorates, or entertains.

| What | Duration | Easing |
|---|---|---|
| Hover state | 120–160ms | default |
| **Press / `:active` state** | **0ms — instant** | — |
| Disclosure, chevron rotation | 150ms | default |
| Bottom sheet in/out | 250ms | `cubic-bezier(.4,0,.2,1)` |
| Value change in a chart | 320ms | default |
| Row removal (with undo) | 200ms | `ease-out` |

Rules:

- **`prefers-reduced-motion` is honoured globally**, collapsing transitions and animations to ~0.01ms
  and disabling smooth scrolling.
- **The press state is never transitioned.** A 150ms fade-in on `:active` reads as lag on touch,
  where there is no hover to precede it.
- **Nothing auto-plays.** Merit has no self-running animation at all.
- Transform and opacity only, **with one exception: a disclosure may animate its own height** at
  150ms, matching the chevron beside it. The motion table above has always listed disclosure, and
  every other way of animating one is unavailable — `interpolate-size` and `calc-size()` are
  Chromium-only, and Merit is used on iPhones. The choice was never "transform or height", it was
  "height or nothing", and a section that snaps open gives no sense of where its content came from.
  Nothing else animates a size. No animated grid columns (§7).
- **No celebratory motion.** Logging a meal is not an achievement to be confettied.

---

## 14. Voice and microcopy

The writing is half the signature, and in a health app it is also most of the ethics.

**Register.** Direct, quiet, technically literate. Second person. Complete sentences with real
punctuation, including em dashes. Never exclamation marks. Never "Oops!". Never an emoji in the
interface. The same in both languages — the German is written, not translated word-for-word.

**Labels are lowercase mono.** `logged today` · `last session` · `not synced yet` · `community entry`.

**Buttons name the consequence, not the mechanism.** `Save set`, not `Submit`. `Add it yourself`, not
`Manual`.

**Numbers get a unit and a comparison.** Not `1420`, but `1420 of 2100 kcal · 680 left`. Not `82.4`,
but `82.4 kg · −0.3 vs. last week`.

**State the position clearly; do not moralise about it.** These are two different things and the
distinction is the whole rule.

*Clear is required.* Whether a target was met, missed or exceeded is the primary thing the dashboard
exists to answer. It is shown plainly and immediately — the bar, the emphasis, the number (§10.9).
Hiding it out of delicacy makes the app useless. Consistency over time is worth showing too, and a
completed session is worth acknowledging.

*Moralising is not.* The difference is whether the interface reports or evaluates:

| Reports | Evaluates |
|---|---|
| `280 over` | `you went over — try to do better tomorrow` |
| `last session: 6 days ago` | `you're falling behind` |
| `4 weeks · 3 sessions each` | `don't break your streak!` |
| `183 g · 340 kcal` | a red badge on a food, a "healthy" score |

Concretely:

- **No food is good or bad.** No per-food score, no traffic light on an item, no "choose wisely".
  Merit reports what a food contains; what to do with that is the user's business.
- **A missed session is a fact, not a rebuke.** Name when the next one is due and stop there.
- **Acknowledgement after a session is one quiet sentence**, and it credits the act, never the body.
- **No comparison against other users**, no leaderboard, no group ranking — including once friends
  and groups arrive in a later iteration. Comparing training volume between friends is a different
  product with a different set of failure modes.
- **Never pressure about tomorrow.** No notification about a streak at risk, no countdown, no daily
  reminder that frames not-logging as failure.

**Honesty over reassurance.** State what is not there: `no product for this barcode` ·
`micronutrients aren't available for this food` · `offline · saved on this device`. Never claim
progress that has not happened.

**Explain the why in one clause where a choice is surprising.** `Nutrition data comes from Open Food
Facts. Anything you add is shared with everyone using Merit.` A user adding a food to a shared
catalogue must know it is shared, in the moment they add it.

**Deletion always offers undo.** A five-second `sonner` toast with an undo action, and the row
removed optimistically. Deleting a day's food by mis-tap and having no way back is the worst thing
this app can do.

**Errors** name what failed and what to do, in one sentence, without apology. Failures that block
nothing fail silently — a barcode that did not resolve is an empty state, not an error dialog.

**The footer is one quiet mono line** stating what Merit is and one true fact about it, plus the
link to the source (§15).

---

## 15. PWA, offline and storage

Merit is installed to a home screen and used in places with no signal.

- **The manifest** carries `name`, `short_name` (`Merit`), `display: standalone`, `theme_color` and
  `background_color` matching the *current* theme, `start_url: "/"`, and maskable icons at 192, 512
  and a 512 maskable variant. A non-maskable icon on Android gets a white box around it.
- **The install prompt is never interrupted by a custom banner** on first visit. If Merit prompts at
  all, it does so from a line in settings.
- **Workout logging works fully offline.** Sets are written to IndexedDB (Dexie) immediately and
  queued for sync; the UI shows the queue state per §10.8 and never blocks on the network.
- **Nutrition and barcode lookup may be online-only** — scanning needs the API. When offline, the
  scanner says so in place rather than failing at the moment of the tap.
- **`localStorage` holds exactly one thing: the theme preference** (§2.5). Application data lives in
  IndexedDB or Supabase. Nothing else goes into `localStorage`, ever.
- **Sync is last-write-wins per row, with the local timestamp preserved.** A set logged at 18:42
  offline is a set logged at 18:42, not at 21:10 when the phone found wifi.
- **A source link is visible to users of the hosted app.** Merit is open source (MIT); the link to
  the repository lives in the footer of the settings screen as a plain mono line. The licence does
  not compel it — showing people the code behind a health tool holding their data does.

---

## 16. Accessibility and motion checklist

Run this before calling a screen done.

### 16.1 Contrast

- [ ] Every text-on-surface pair clears **4.5:1 in both themes**. Compute it, do not judge it.
- [ ] The accent clears 4.5:1 on `bg`, `surface`, `surface-2` **and** on `accent-soft`.
- [ ] `bg` used as text on an `accent` fill clears 4.5:1 (the primary button inverts).
- [ ] Every chart series is distinguishable from its neighbours **in greyscale**.
- [ ] Hairlines are exempt and expected to be low-contrast (~1.2–1.6:1) — they are decorative
      separators, not controls. Anything conveying *state* through its border must clear 3:1; that is
      why the focus ring is the accent and not `line`.

Moss worst case: **5.31:1**. Every other pair sits between 5 and 15:1.

### 16.2 Everything else

- [ ] `:focus-visible` is a **2px accent outline with 2px offset and a 2px radius**, defined once
      globally. Never removed, and never replaced by shadcn's ring.
- [ ] Every interactive element is reachable and operable by keyboard, in DOM order.
- [ ] **Every touch target is at least 44×44px**, with at least 8px between adjacent targets.
- [ ] Every row and button has a visible `:active` state.
- [ ] Icon-only buttons have an `aria-label` and a `title`.
- [ ] Toggles use `aria-pressed`; disclosures `aria-expanded`; groups `role="group"` with a label;
      progress `role="progressbar"` with `aria-valuenow/min/max`.
- [ ] Charts are `role="img"` with a descriptive `aria-label` and a visually hidden data table.
- [ ] Decorative SVG is `aria-hidden`.
- [ ] Short forms of a label carry the long form in a visually hidden span (`P` → `Protein`).
- [ ] `prefers-reduced-motion` collapses transitions globally.
- [ ] Nothing conveys meaning by colour alone.
- [ ] Text stays selectable; `user-select: none` only on genuine controls.
- [ ] **The screen has been opened at 375px, in German, in both themes**, with the keyboard open on
      every form.

### 16.3 The contrast script

Keep this in the project. It takes ten seconds and removes the guessing.

```js
const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const L = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
export const ratio = (a, b) => {
  const [x, y] = [L(a), L(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};
```

---

## 17. Anti-patterns

If any of these appear, the design language has been left behind — regardless of whether the tokens
are still in use.

**Carried over from the house style**

- A drop shadow on a card, or a card grid where a row list belongs.
- A border radius above 6px. Pill-shaped buttons.
- A second accent colour. A colour per category in the *interface*.
- A literal hex value inside a component or an SVG.
- `uppercase` + wide `tracking` as a section label.
- Running text in mono. Serif in labels or body copy. Serif more than once per screen.
- An emoji or a text character used as an icon.
- A gradient, anywhere.
- Pure `#000` or `#fff`.
- A spinner where a real empty state belongs.
- A theme that flashes the wrong colours on reload.
- Content collapsed by default on a screen someone opened to read it. The component was never the
  problem — a section that opens expanded and *can* be collapsed hides nothing and adds a control
  (§10.11). Starting collapsed is what costs a tap to reach what they came for.

**Merit's own**

- A shadcn component shipped with its default styling — a `shadow-sm`, a `rounded-xl`, an `h-9`
  button, or shadcn's focus ring.
- An input under 16px on mobile, or `user-scalable=no` used to hide the resulting zoom.
- A touch target under 44px, or two targets closer than 8px.
- `100vh` anywhere.
- A green/amber/red scale on a number, or the accent used to mean "on target" (§2.3).
- A screen where you cannot tell at a glance whether the target was met — the opposite failure, and
  the more likely one when this list is followed too literally.
- A per-food score, a "healthy" badge, or any judgement attached to an item rather than a total.
- A flame, a streak-at-risk notification, or a congratulation aimed at a body rather than an act.
- A destructive action without undo.
- A hover-only tooltip on a chart.
- A chart series told apart by colour alone.
- Anything in `localStorage` other than the theme.
- A catalogue or a long list with no way to narrow it: no grouping, no filter, search only. It is
  survivable at thirty rows and hostile at two hundred, which is what a shared catalogue becomes
  (§10.11).
- A hardcoded user-facing string, or a layout that only fits the English label.
- The source link missing from the shipped app.

---

## Appendix A — `tokens.css`

Drop-in, with Merit's Moss accent. Tokens are prefixed `--merit-` so they cannot collide with
shadcn's or any library's own custom properties, and so a grep for the palette is unambiguous.

```css
/*
 * Merit design tokens. Two complete themes, resolved to a `data-theme` attribute
 * on <html> by the bootstrap script in index.html before the first paint.
 *
 * Neutrals follow the Vitesse editor themes, shared with NCLA.
 * Accent: Moss. Worst contrast ratio 5.31:1 — see DESIGN.md §16.3.
 */

:root {
  color-scheme: light;

  --merit-bg: #fdfcf9;
  --merit-surface: #ffffff;
  --merit-surface-2: #f4f1ea;
  --merit-line: #e5e0d5;
  --merit-line-strong: #d5cdbd;
  --merit-ink: #262521;
  --merit-ink-muted: #6b6555;
  --merit-ink-faint: #736c5c;
  --merit-accent: #4f6b2c;
  --merit-accent-soft: #eef2e2;
  --merit-danger: #a33a2b;

  /* Charts only. Never referenced outside a chart component. */
  --merit-chart-1: #4f6b2c;   /* protein  */
  --merit-chart-2: #8a6a3d;   /* fat      */
  --merit-chart-3: #3f6a72;   /* carbs    */
  --merit-chart-4: #9a9384;   /* weight, raw     */
  --merit-chart-5: #4f6b2c;   /* weight, average */
}

:root[data-theme="dark"] {
  color-scheme: dark;

  --merit-bg: #121212;
  --merit-surface: #1a1a1a;
  --merit-surface-2: #222220;
  --merit-line: #2c2c29;
  --merit-line-strong: #3a3a36;
  --merit-ink: #dbd7ca;
  --merit-ink-muted: #a29c8b;
  --merit-ink-faint: #979083;
  --merit-accent: #a8c27a;
  --merit-accent-soft: #1b2113;
  --merit-danger: #cb7676;

  --merit-chart-1: #a8c27a;
  --merit-chart-2: #d0a874;
  --merit-chart-3: #7fb2bb;
  --merit-chart-4: #6f6a5e;
  --merit-chart-5: #a8c27a;
}

/* Correct before the bootstrap script runs, and with JS disabled. */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;

    --merit-bg: #121212;
    --merit-surface: #1a1a1a;
    --merit-surface-2: #222220;
    --merit-line: #2c2c29;
    --merit-line-strong: #3a3a36;
    --merit-ink: #dbd7ca;
    --merit-ink-muted: #a29c8b;
    --merit-ink-faint: #979083;
    --merit-accent: #a8c27a;
    --merit-accent-soft: #1b2113;
    --merit-danger: #cb7676;

    --merit-chart-1: #a8c27a;
    --merit-chart-2: #d0a874;
    --merit-chart-3: #7fb2bb;
    --merit-chart-4: #6f6a5e;
    --merit-chart-5: #a8c27a;
  }
}
```

Note that `--merit-chart-1` and `--merit-chart-5` are intentionally the same value as the accent:
protein and the weight average are the emphasised series in their respective charts, and they never
appear in the same chart as each other.

---

## Appendix B — Tailwind v4 and the shadcn bridge

Tailwind v4 needs no config file. One `@theme inline` block maps the house tokens onto utilities, and
one `:root` block maps shadcn's expected variable names onto the same tokens. Both resolve at runtime,
so the themes keep working.

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "./tokens.css";

@custom-variant dark (&:is([data-theme="dark"] *));

/* ── House tokens as Tailwind utilities ──────────────────────────────
   bg-surface, text-ink-faint, border-line, text-2xs all become real classes. */
@theme inline {
  --color-bg: var(--merit-bg);
  --color-surface: var(--merit-surface);
  --color-surface-2: var(--merit-surface-2);
  --color-line: var(--merit-line);
  --color-line-strong: var(--merit-line-strong);
  --color-ink: var(--merit-ink);
  --color-ink-muted: var(--merit-ink-muted);
  --color-ink-faint: var(--merit-ink-faint);
  --color-accent: var(--merit-accent);
  --color-accent-soft: var(--merit-accent-soft);
  --color-danger: var(--merit-danger);

  --font-sans: "IBM Plex Sans Variable", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, "Cascadia Code", Consolas, monospace;
  --font-serif: "IBM Plex Serif", ui-serif, Georgia, serif;

  /* One step up from NCLA — a phone held at arm's length. See DESIGN.md §4.2. */
  --text-2xs: 0.75rem;
  --text-xs: 0.8125rem;
  --text-sm: 0.875rem;
  --text-base: 0.9375rem;
  --text-input: 1rem;      /* iOS zooms below this. Non-negotiable on mobile. */
  --text-prose: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.375rem;
  --text-2xl: 1.75rem;
  --text-3xl: 2.125rem;

  /* Radius scales with the surface. Controls stay tight; sheets do not. §6. */
  --radius-sm: 3px;
  --radius-md: 5px;
  --radius-lg: 10px;
  --radius-xl: 14px;
}

/* ── shadcn bridge ───────────────────────────────────────────────────
   shadcn components reference these names. They are mapped onto the house
   tokens here and nowhere else. Two mappings are counter-intuitive:

     --accent  in shadcn means "subtle hover fill", NOT the brand accent.
               The brand accent is --primary.
     --muted   in shadcn is a BACKGROUND; --muted-foreground is the text.

   Getting either wrong produces a UI where every hover is moss green. */
:root {
  --background: var(--merit-bg);
  --foreground: var(--merit-ink);

  --card: var(--merit-surface);
  --card-foreground: var(--merit-ink);
  --popover: var(--merit-surface);
  --popover-foreground: var(--merit-ink);

  --primary: var(--merit-accent);
  --primary-foreground: var(--merit-bg);

  --secondary: var(--merit-surface-2);
  --secondary-foreground: var(--merit-ink);

  --muted: var(--merit-surface-2);
  --muted-foreground: var(--merit-ink-muted);

  --accent: var(--merit-surface-2);        /* hover fill — see note above */
  --accent-foreground: var(--merit-ink);

  --destructive: var(--merit-danger);
  --destructive-foreground: var(--merit-bg);

  --border: var(--merit-line);
  --input: var(--merit-line);
  --ring: var(--merit-accent);

  --chart-1: var(--merit-chart-1);
  --chart-2: var(--merit-chart-2);
  --chart-3: var(--merit-chart-3);
  --chart-4: var(--merit-chart-4);
  --chart-5: var(--merit-chart-5);

  --radius: 5px;                            /* shadcn ships 0.5rem */
}

@layer base {
  * {
    border-color: var(--color-line);
  }

  body {
    background-color: var(--color-bg);
    color: var(--color-ink);
    font-family: var(--font-sans);
    font-size: var(--text-base);
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    /* The installed PWA has no browser chrome to absorb the notch. */
    padding-bottom: env(safe-area-inset-bottom);
  }

  /* Every changing number is tabular, or the dashboard jitters as you type. */
  .tnum,
  input[inputmode="decimal"],
  input[inputmode="numeric"] {
    font-variant-numeric: tabular-nums;
  }

  /* iOS zooms a focused input under 16px. Never suppress with user-scalable=no. */
  @media (max-width: 767px) {
    input, textarea, select { font-size: var(--text-input); }
  }

  :focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
    border-radius: 2px;
  }

  ::selection {
    background-color: var(--color-accent-soft);
    color: var(--color-ink);
  }

  /* Motion is feedback, never decoration. */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      transition-duration: 0.01ms !important;
      animation-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
}
```

Long-form copy (privacy policy, imprint) gets a small hand-written prose class rather than the
typography plugin — it is thirty lines and it stays under control:

```css
.prose-app { font-size: var(--text-prose); line-height: 1.7; }
.prose-app > * + * { margin-top: 0.85em; }
.prose-app :is(ul, ol) { padding-left: 1.35rem; list-style: revert; }
.prose-app li + li { margin-top: 0.35rem; }
.prose-app li::marker { color: var(--color-ink-faint); }
.prose-app a {
  color: var(--color-accent);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
}
.prose-app strong { font-weight: 600; color: var(--color-ink); }
```

---

## Appendix C — React primitives

The components worth writing on day one. Everything else grows from them, and the shadcn components
sit alongside rather than replacing them.

```tsx
import type { ReactNode } from "react";

export function PageHeader({ title, lead }: { title: string; lead?: string }) {
  return (
    <header className="mb-6 md:mb-8">
      <h1 className="text-xl font-semibold tracking-tight text-balance">{title}</h1>
      {lead ? <p className="mt-2 max-w-[68ch] text-ink-muted">{lead}</p> : null}
    </header>
  );
}

/** A bordered region. Borders define structure here — shadows are for overlays only.
 *  Used instead of shadcn's Card, which ships a shadow. */
export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-line bg-surface ${className}`}>{children}</div>;
}

/** Small mono label used above groups of content. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="font-mono text-2xs text-ink-faint">{children}</p>;
}

export function SectionHead({ label, hint }: { label: string; hint?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4 border-b border-line pb-2">
      <h2 className="font-mono text-2xs tracking-wide text-ink-faint">{label}</h2>
      {hint ? <span className="font-mono text-2xs text-ink-faint">{hint}</span> : null}
    </div>
  );
}

/** A list rendered as bordered rows rather than a grid of cards.
 *  Rows are 52px minimum on touch — see DESIGN.md §5.2. */
export function Rows({ children }: { children: ReactNode }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
      {children}
    </ul>
  );
}

export function Row({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-[52px] w-full items-center gap-3 px-4 py-3 text-left
                   transition-colors hover:bg-surface-2 active:bg-surface-2
                   [transition-duration:140ms] active:[transition-duration:0ms]"
      >
        {children}
      </button>
    </li>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-line bg-surface px-4 py-6 text-center text-sm text-ink-muted">
      {children}
    </p>
  );
}

/** A number with its unit. Tabular so it does not jitter as it changes. */
export function Value({ n, unit, size = "base" }: { n: string; unit?: string; size?: "base" | "lg" | "xl" }) {
  const cls = { base: "text-base", lg: "text-lg", xl: "text-3xl" }[size];
  return (
    <span className="font-mono tabular-nums">
      <span className={`${cls} text-ink`}>{n}</span>
      {unit ? <span className="ml-1 text-2xs text-ink-faint">{unit}</span> : null}
    </span>
  );
}
```

And the accent edge, the one piece of pure voice — in Merit it carries the dashboard's single
sentence about the day:

```tsx
export function Statement({ children }: { children: ReactNode }) {
  return (
    <div className="border-l-2 border-accent py-1 pl-4">
      <p className="max-w-[62ch] font-serif text-lg leading-snug">{children}</p>
    </div>
  );
}
```

---

## Appendix D — Starting work

1. `tokens.css` and this file into the repo. `DESIGN.md` at the root, `tokens.css` in `src/styles/`.
2. Install Tailwind v4, then `npx shadcn@latest init`. Answer its questions, then **overwrite the CSS
   variable block it generates** with Appendix B. It will have written its own defaults.
3. Add the inline theme bootstrap to `<head>` (§2.5) **before** anything else, plus the theme module
   with the `light | dark | system` preference and the `theme-color` meta update.
4. Install the three IBM Plex packages from npm; import only the weights in use.
5. Drop in the primitives from Appendix C.
6. Add shadcn components one at a time, as screens need them, applying §3.2 in the same commit.
7. Build the dashboard first — it uses more of this document than any other screen. Then read §17
   with it open at 375px, in German, in both themes, and fix whatever is listed.

Two habits worth keeping from the start: no literal colour ever reaches a component, and every piece
of interface copy is written as though somebody will read it standing between two sets, in a hurry,
in their second language.

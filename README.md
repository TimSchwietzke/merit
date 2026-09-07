# Merit

*Meals, Exercise, Reps, Intake, Training.*

A self-hosted, invite-only web app for tracking nutrition and strength training.
German and English, light and dark, built phone-first.

## Getting started

```sh
npm install
cp .env.example .env    # fill in the Supabase URL and anon key
npm run dev
```

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | type-check, then a production build into `dist/` |
| `npm run preview` | serve the production build locally |
| `npm run lint` | oxlint |

## Where things are

| File | What it is |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | the working agreement: stack, hard rules, conventions |
| [`DESIGN.md`](DESIGN.md) | the design system — binding, and read before any UI work |
| [`docs/GOAL.md`](docs/GOAL.md) | what the product is and what it is deliberately not |

`src/styles/tokens.css` holds the palette. No literal colour ever reaches a
component, and every user-facing string goes through i18n from the moment it is
written.

## Licence

MIT — see [LICENSE](LICENSE).

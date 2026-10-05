# Save a meal as a recipe

## Goal
Turn a meal that has already been logged into a recipe in one step, so a
combination eaten regularly does not have to be rebuilt in the recipe editor.
For anyone logging food in merit.

## Context
- Recipes exist (PR #36): `recipes` and `recipe_items` (a recipe holds foods
  with amounts in grams, never other recipes), the list at `/food/recipes`, the
  editor at `/food/recipes/:id`, logging from add-food.
- The day view (`src/features/nutrition/FoodPage.tsx`) groups the day's entries
  by meal (frühstück, mittag, abend, snack). An entry is either a single food
  or an ingredient row of a logged recipe line (`food_logs.group_id`), whose
  amount is the portion actually logged that day.
- UI follows `DESIGN.md` (via `docs/design-system.md`). Every user-facing string
  exists in German and English (CLAUDE.md, hard rule 3). No explanatory text
  for what a control already shows (CLAUDE.md, review before merge).
- Recipe names are 1 to 120 characters after trimming (database constraint).
- Logged and recipe amounts are stored to 0.1 g and capped at 10000 g per row
  (`food_logs.quantity_g`, `recipe_items.quantity_g`). The day view displays
  grams rounded to whole numbers; storage is never rounded beyond the column
  (CLAUDE.md, Code).
- Empty meals are not rendered in the day view at all.
- Saving goes through one new database function in a new additive migration,
  so a recipe and its ingredients are written in one transaction (decided by
  the owner). The migration is tested on the local stack first and pushed to
  production only after a data dump and the owner's approval (CLAUDE.md, hard
  rule 6).

## User Stories
- As a person logging food, I want to save a meal I have just logged as a
  recipe, so that next time I log the same combination in one tap.
- As a person logging food, I want to leave out some of the meal's foods when
  saving, so that a one-off extra does not end up in the recipe.

## Acceptance Criteria
- **AC1:** Given a meal with at least one entry, When the day view is shown,
  Then that meal's heading row has a control labelled "als rezept speichern" /
  "save as recipe".
- **AC2:** Given a day with no entries, When the day view is shown, Then no
  save-as-recipe control is shown anywhere in it.
- **AC3:** Given a meal with entries, When the control is used, Then a sheet
  titled "als rezept speichern" / "save as recipe" opens, listing every food of
  that meal with its amount in grams (displayed in the same format as the day
  view), and a name field.
- **AC4:** Given the meal contains a logged recipe line, When the sheet opens,
  Then that line appears as its individual ingredients, each with the amount
  logged that day, not as one row.
- **AC5:** Given the meal contains the same food (same catalogue food, i.e. the
  same `food_id`) more than once, as single entries and/or inside recipe lines,
  When the sheet opens, Then that food appears once, with the logged amounts
  added together, at the position of its first occurrence in the day view.
- **AC6:** Given the sheet is open, When an ingredient's remove control is used,
  Then the ingredient disappears from the list and will not be part of the
  saved recipe.
- **AC7:** Given the sheet is open, Then ingredient amounts cannot be edited in
  it.
- **AC8:** Given every ingredient has been removed in the sheet, Then the save
  button is disabled (the empty list is the reason; no extra text).
- **AC9:** Given a name was typed, When saved, Then a recipe with that name
  (trimmed) is created, containing exactly the ingredients left in the sheet,
  each with the sum of its logged amounts, unrounded (to the column's 0.1 g).
- **AC10:** Given the name field is left empty or contains only spaces, When
  saved, Then the recipe is named "<Meal> #<n>". <Meal> is the meal's name in
  the current UI language with a capital first letter ("Snack", "Frühstück",
  "Breakfast"). <n> is one more than the highest N among the user's recipes
  whose trimmed name matches "<Meal> #N" exactly, compared case-insensitively,
  with N a positive integer without leading zeros; recipes named in the other
  language do not count. With no match, <n> is 1.
- **AC11:** Given the sheet is open, Then the name field's placeholder shows the
  name AC10 would give (for example "Snack #3").
- **AC12:** Given the name field, Then no more than 120 characters can be
  entered.
- **AC13:** Given a merged amount (AC5) exceeds 10000 g, Then that row is marked
  as invalid, the save button is disabled, and a one-line reason is shown
  beneath the list until the row is removed.
- **AC14:** Given the recipe was saved, Then the sheet closes, no navigation
  happens (the same date stays selected and the scroll position is unchanged),
  and a toast names the saved recipe ("Snack #3 gespeichert" / "Snack #3
  saved").
- **AC15:** Given the recipe was saved, Then the day's logged entries are
  unchanged: same foods, amounts, meals and recipe lines as before.
- **AC16:** Given the recipe was saved, When add-food or the recipe list is
  opened, Then the new recipe is listed there.
- **AC17:** Given saving fails (for example no connection), Then the sheet stays
  open with its name and ingredients, an inline error inside the sheet
  (announced to screen readers) says in one sentence that the recipe was not
  saved and to try again, the save button stays enabled for a retry, and no
  recipe and no partial recipe exists afterwards.
- **AC18:** Given the sheet is dismissed without saving, Then no recipe is
  created.
- **AC19:** Given the sheet is opened again, Then it starts from the meal's
  current entries, with nothing removed and the name empty.
- **AC20:** The control, the sheet, its remove controls, the name field and the
  save button are reachable and operable by keyboard and have accessible
  names; each remove control names the food it removes.
- **AC21:** Given save was pressed, While the save is in progress, Then the
  save button is disabled, so one press creates at most one recipe.

## Edge Cases
- Day without entries → no control (AC2); empty meals are never shown.
- Meal holds only one food → the control is offered; a one-ingredient recipe is
  allowed (AC1, AC9).
- Meal holds a recipe line → broken down into ingredients (AC4).
- Same food twice → merged with summed amount, first position (AC5).
- Two different products of the same kind (e.g. two oat brands) → different
  foods, not merged (AC5).
- Merged amount over 10000 g → row marked, save disabled until removed (AC13).
- All ingredients removed → save disabled (AC8).
- Empty or whitespace-only name → numbered default name, visible as the
  placeholder beforehand (AC10, AC11).
- A default-numbered recipe was renamed or deleted → numbering continues from
  the highest number still present (AC10).
- The default name is resolved by the database at save time; the placeholder
  is a preview from the recipes loaded in the app. If that list is stale or
  unavailable, the saved name still follows AC10 and the toast shows it (AC10,
  AC11, AC14).
- An amount below 0.5 g displays as "0 g" in the sheet (whole-gram format, as
  in the day view) and is saved exactly, e.g. 0.3 g (AC3, AC9). Intended.
- "Snack" is the same word in German and English, so for snacks recipes named
  in either language count towards the number; for the other meals they do not
  (AC10).
- Two saves at the same moment (two tabs) may produce the same default number;
  accepted, as duplicate typed names are too.
- Network failure while saving → nothing created, sheet keeps its state, retry
  possible (AC17).
- Sheet closed and reopened → starts fresh (AC19).
- Viewing a past day → works the same; the recipe is not tied to a date (AC1,
  AC9).

## Out of Scope
- Recipes that contain other recipes (nested recipes).
- Changing ingredient amounts in the dialog (done afterwards in the recipe
  editor).
- Turning the day's existing entries into a recipe line.
- Saving entries from several meals into one recipe, or choosing individual
  entries across meals.
- A settings option for how recipe lines are treated.

## Assumptions
- ASSUMPTION: A logged recipe line inside the meal is always broken down into
  its ingredients (AC4). Keeping it as a reference to its recipe would need
  nested recipes, which are out of scope. Agreed with the owner ("make it like
  you think it fits").
- ASSUMPTION: Ingredients appear in the sheet, and in the saved recipe, in the
  order they appear in the day view (a merged food at its first occurrence).
- ASSUMPTION: A typed name may equal an existing recipe's name; the default
  numbering avoids duplicates except for simultaneous saves.
- ASSUMPTION: Saving needs a connection, like the rest of nutrition logging; no
  offline queue.
- ASSUMPTION: The dialog is the existing `Sheet` (bottom sheet below md, dialog
  above), consistent with the other short in-place edits in the app.

## Open Questions
- None.

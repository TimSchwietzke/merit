-- ─────────────────────────────────────────────────────────────────────
-- `done` goes.
--
-- It existed so a routine could put sets on a day before they were performed,
-- which meant a control on every row to say "this one happened", a tick that
-- earned its place only because the column existed. Once every row is directly
-- editable, entering the set *is* doing the set, and a set that did not happen
-- is one you swipe away.
--
-- The distinction cost more interface than it bought: a column of ticks, a
-- second visual state per row, and a rule in every calculation. Volume now
-- counts the rows that are there, which is the same answer for anybody who
-- removes the sets they did not do.
-- ─────────────────────────────────────────────────────────────────────

drop index if exists public.workout_sets_done_idx;

alter table public.workout_sets drop column done;

-- ─────────────────────────────────────────────────────────────────────
-- Finishing a session has to survive a reload.
--
-- "Einheit beenden" only set a flag in React state. A session is *running*
-- while today holds a set nobody has logged yet, so the moment the page
-- reloaded that flag was gone, the query said there were still unlogged sets,
-- and the bar came straight back. The button appeared to do nothing, because
-- from the app's point of view nothing had happened.
--
-- A timestamp rather than a boolean: it answers the same question by being
-- null or not, and it also records when — which is the difference between a
-- session that was finished and one that was abandoned three days ago. It also
-- avoids a second column called `done` sitting one join away from
-- `workout_sets.done` and meaning something else.
--
-- Unlogged sets are deliberately left alone. Finishing a session says the
-- session is over, not that the sets you did not get to never existed; they
-- stay on the day as what was planned and not done, which is the honest record
-- and what the week screen already counts.
-- ─────────────────────────────────────────────────────────────────────

alter table public.workouts
  add column ended_at timestamptz;

comment on column public.workouts.ended_at is
  'When the session was finished. Null while it is still running.';

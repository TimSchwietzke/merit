-- ─────────────────────────────────────────────────────────────────────
-- Whether this account has been past the first-run walkthrough.
--
-- One nullable column rather than a table, because the walkthrough collects
-- nothing that does not already have a home: `profiles` holds the name and the
-- body figures, `weight_logs` the first weigh-in, `nutrition_goals` the target.
-- The single fact none of them can answer is whether the question has been put
-- to this account yet, and that is all this records.
--
-- Null means still to ask. Quitting halfway leaves it null on purpose: the next
-- start picks up at the first question without an answer rather than beginning
-- again. It is set when the walkthrough finishes *and* when it is dismissed,
-- since both mean "stop asking"; the account screen can start it again.
--
-- Existing accounts are stamped as done. They set themselves up by hand before
-- this existed, and walking them through a setup they already did would be the
-- app not noticing.
-- ─────────────────────────────────────────────────────────────────────

alter table public.profiles
  add column onboarded_at timestamptz;

comment on column public.profiles.onboarded_at is
  'When the first-run walkthrough was finished or dismissed. Null means it is still to be asked.';

update public.profiles set onboarded_at = now();

-- ─────────────────────────────────────────────────────────────────────
-- A routine plans each set, not a number of identical ones.
--
-- `3 × 8` cannot say 12/10/8, which is what most people actually write down.
-- One array replaces the pair: its length is how many sets, its values are the
-- reps for each. No join, and no way for the count and the reps to disagree.
-- ─────────────────────────────────────────────────────────────────────

alter table public.routine_exercises
  add column set_reps smallint[];

update public.routine_exercises
  set set_reps = array_fill(target_reps::smallint, array[target_sets]);

-- A check constraint may not contain a subquery, so the per-element bound goes
-- through an immutable function, which one may.
create function public.all_between(numbers smallint[], low int, high int)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select bool_and(number between low and high) from unnest(numbers) as number;
$$;

alter table public.routine_exercises
  alter column set_reps set not null,
  add constraint routine_exercises_set_reps_shape
    check (
      array_length(set_reps, 1) between 1 and 20
      and public.all_between(set_reps, 1, 1000)
    );

alter table public.routine_exercises
  drop column target_sets,
  drop column target_reps;

comment on column public.routine_exercises.set_reps is
  'Reps per set, in order. Length is the number of sets, so the two cannot disagree.';

-- ── the pause goes ───────────────────────────────────────────────────
-- Never asked for. It was proposed as an answer to a fortnight away, the answer
-- chosen was picking the days by hand, and this was built anyway.
alter table public.profiles drop column plan_paused_until;

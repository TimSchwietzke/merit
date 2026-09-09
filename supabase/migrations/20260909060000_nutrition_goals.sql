-- ─────────────────────────────────────────────────────────────────────
-- nutrition_goals — the daily targets a day's totals are measured against
-- (GOAL.md §7).
--
-- Kept as a history rather than one editable row. `valid_from` means a target
-- changed in March does not silently rewrite what January was measured against,
-- and the consistency view (DESIGN.md §10.10) reads days against the target
-- that was in force on the day.
--
-- `mode` records where the calorie figure came from. Both must work and the
-- user can switch (GOAL.md §5), so which one is active is a stored fact, not
-- something inferred from whether the other fields happen to be filled in.
-- ─────────────────────────────────────────────────────────────────────

create table public.nutrition_goals (
  user_id     uuid not null references auth.users (id) on delete cascade,

  -- The first day this target applies to. One target per user per day.
  valid_from  date not null default current_date,

  mode        text not null check (mode in ('manual', 'calculated')),

  kcal        integer not null check (kcal between 500 and 10000),

  -- Grams. Only these three carry user-set targets alongside energy; fibre,
  -- sugars, saturates and salt use reference values (GOAL.md §4).
  protein_g   integer not null check (protein_g between 0 and 1000),
  fat_g       integer not null check (fat_g between 0 and 1000),
  carbs_g     integer not null check (carbs_g between 0 and 2000),

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  primary key (user_id, valid_from)
);

comment on table public.nutrition_goals is
  'Daily nutrition targets, kept as a history so a change today does not rewrite what last month was measured against.';

alter table public.nutrition_goals enable row level security;

create policy "nutrition_goals: owner reads own rows"
  on public.nutrition_goals for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "nutrition_goals: owner inserts own rows"
  on public.nutrition_goals for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "nutrition_goals: owner updates own rows"
  on public.nutrition_goals for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "nutrition_goals: owner deletes own rows"
  on public.nutrition_goals for delete
  to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.nutrition_goals to authenticated;

create trigger nutrition_goals_set_updated_at
  before update on public.nutrition_goals
  for each row execute function public.set_updated_at();

-- Every read is "my target as at this day", which walks back from the date.
create index nutrition_goals_user_from_idx
  on public.nutrition_goals (user_id, valid_from desc);

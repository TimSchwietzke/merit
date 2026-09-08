-- ─────────────────────────────────────────────────────────────────────
-- weight_logs — one weigh-in per user per day (GOAL.md §7).
--
-- The primary key is (user_id, date) rather than a surrogate id. A day has one
-- weight: stepping on the scale twice does not produce two facts, it corrects
-- one. That makes logging an upsert, which is what the form needs — re-logging
-- today replaces today rather than growing a second row the chart would have to
-- pick between.
--
-- `date` is a `date`, not a timestamptz. A weigh-in belongs to the day the user
-- was standing on the scale in their own timezone, and the client sends that day
-- (CLAUDE.md, Dates).
-- ─────────────────────────────────────────────────────────────────────

create table public.weight_logs (
  user_id       uuid not null references auth.users (id) on delete cascade,
  date          date not null,

  -- One decimal is what a bathroom scale reports. numeric, not float: the
  -- rolling average is computed from these and a binary float would drift.
  weight_kg     numeric(5, 2) not null check (weight_kg > 0 and weight_kg < 700),

  body_fat_pct  numeric(4, 1) check (body_fat_pct > 0 and body_fat_pct < 100),

  -- Circumferences (waist, chest, …). The column exists from day one so the
  -- shape is settled; which sites Merit offers is a product decision that has
  -- not been made, so nothing writes to it yet (GOAL.md §2.1).
  measurements  jsonb,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  primary key (user_id, date)
);

comment on table public.weight_logs is
  'One weigh-in per user per day. Keyed on (user_id, date) so logging a day again corrects it.';

alter table public.weight_logs enable row level security;

-- A policy per verb, keyed on the owner and no broader (CLAUDE.md hard rule 2).
-- Unlike profiles this table takes inserts and deletes from the client, so all
-- four verbs are spelled out. `auth.uid()` is wrapped in a subselect so the
-- planner evaluates it once per statement rather than once per row.
create policy "weight_logs: owner reads own rows"
  on public.weight_logs for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "weight_logs: owner inserts own rows"
  on public.weight_logs for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "weight_logs: owner updates own rows"
  on public.weight_logs for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "weight_logs: owner deletes own rows"
  on public.weight_logs for delete
  to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.weight_logs to authenticated;

create trigger weight_logs_set_updated_at
  before update on public.weight_logs
  for each row execute function public.set_updated_at();

-- No index beyond the primary key: every query this table serves is
-- "my rows, a date range, in date order", which the (user_id, date) key
-- already answers.

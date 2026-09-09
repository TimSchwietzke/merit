-- ─────────────────────────────────────────────────────────────────────
-- Per-date scheduling, several sessions a day, and a set that is logged
-- or not.
--
-- The weekly pattern in `routine_days` stays the plan. This adds the
-- exceptions to it, which is what moving, swapping, replacing and adding a
-- session all are: `Monday = Oberkörper 1` remains true while this Monday
-- happens to be something else.
-- ─────────────────────────────────────────────────────────────────────

create table public.scheduled_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  routine_id      uuid not null references public.routines (id) on delete cascade,
  scheduled_date  date not null,

  -- `added` puts a routine on a day the weekly pattern does not, `skipped`
  -- takes one off a day the pattern does. A swap is two of each: the pattern is
  -- never edited, so next week is unaffected by what happened this week.
  status          text not null check (status in ('added', 'skipped')),

  created_at      timestamptz not null default now(),

  unique (user_id, routine_id, scheduled_date)
);

comment on table public.scheduled_sessions is
  'Exceptions to the weekly pattern for one date. The pattern in routine_days is the plan; this is what happened to it.';

alter table public.scheduled_sessions enable row level security;

create policy "scheduled_sessions: owner reads own rows"
  on public.scheduled_sessions for select to authenticated
  using (user_id = (select auth.uid()));
create policy "scheduled_sessions: owner inserts own rows"
  on public.scheduled_sessions for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "scheduled_sessions: owner updates own rows"
  on public.scheduled_sessions for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "scheduled_sessions: owner deletes own rows"
  on public.scheduled_sessions for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.scheduled_sessions to authenticated;

create index scheduled_sessions_user_date_idx
  on public.scheduled_sessions (user_id, scheduled_date);

-- ── several sessions in a day ────────────────────────────────────────
-- "You have already trained today — a second session?" is a question the old
-- constraint answered with an error.
alter table public.workouts drop constraint workouts_user_id_date_key;

create index workouts_user_date_routine_idx on public.workouts (user_id, date, routine_id);

-- ── a set is logged, or it is waiting ────────────────────────────────
-- Back, deliberately. It was dropped when the only way to set it was a tick on
-- every row; the session bar sets it instead, and the row shows it by going
-- grey rather than by growing a control. Default false: from here a set exists
-- because a routine planned it, and becomes logged when it is done.
alter table public.workout_sets
  add column done boolean not null default false;

comment on column public.workout_sets.done is
  'True once the set has been logged. A planned set that was never performed stays false and counts for nothing.';

-- Everything already in the table was logged by hand before planned sets
-- existed, so all of it happened.
update public.workout_sets set done = true;

create index workout_sets_done_idx on public.workout_sets (user_id, done);

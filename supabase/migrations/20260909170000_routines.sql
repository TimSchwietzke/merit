-- ─────────────────────────────────────────────────────────────────────
-- routines, routine_exercises, the weekly plan, and planned sets
-- (GOAL.md §5, §7).
--
-- A routine is a reusable training day, "Oberkörper 1", holding exercises in
-- order with a target number of sets and reps. Starting one materialises those
-- targets as real, not-yet-done sets on today's workout, which is what makes
-- "change it for today only" and "change it from now on" two different writes
-- rather than two different data models: the first edits a row belonging to the
-- day, the second edits the routine as well.
--
-- Scheduling is a weekly pattern, not a calendar of instances. `Monday = Upper
-- A` is the plan; going on Tuesday because Monday did not happen is just doing
-- it on Tuesday, and needs no instance to move.
-- ─────────────────────────────────────────────────────────────────────

create table public.routines (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,

  name        text not null check (length(btrim(name)) between 1 and 60),

  -- Order in the user's own list. Not alphabetical: "Oberkörper 1" before
  -- "Oberkörper 2" before "Beine" is a sequence, not a sort.
  position    integer not null default 0,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  unique (user_id, name)
);

comment on table public.routines is
  'A reusable training day. Starting one writes its planned sets onto that day''s workout.';

alter table public.routines enable row level security;

create policy "routines: owner reads own rows"
  on public.routines for select to authenticated using (user_id = (select auth.uid()));
create policy "routines: owner inserts own rows"
  on public.routines for insert to authenticated with check (user_id = (select auth.uid()));
create policy "routines: owner updates own rows"
  on public.routines for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "routines: owner deletes own rows"
  on public.routines for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.routines to authenticated;

create trigger routines_set_updated_at
  before update on public.routines for each row execute function public.set_updated_at();

-- ── routine_exercises ────────────────────────────────────────────────
create table public.routine_exercises (
  -- A surrogate key, not (routine_id, exercise_id): the same lift can appear
  -- twice in one day, and a routine that cannot hold squats at the start and
  -- again at the end is a routine that argues with its owner.
  id           uuid primary key default gen_random_uuid(),
  routine_id   uuid not null references public.routines (id) on delete cascade,
  exercise_id  uuid not null references public.exercises (id) on delete restrict,

  position     integer not null,
  target_sets  integer not null check (target_sets between 1 and 20),
  target_reps  integer not null check (target_reps between 1 and 1000),

  created_at   timestamptz not null default now(),

  unique (routine_id, position) deferrable initially deferred
);

comment on table public.routine_exercises is
  'The exercises of a routine, in order, with the sets and reps it plans for.';

-- The position uniqueness is deferred because reordering swaps two rows, and a
-- swap passes through a state where both hold the same number.

alter table public.routine_exercises enable row level security;

-- Ownership comes from the routine. The subquery is the price of not
-- denormalising a user_id onto a table nothing queries by user.
create policy "routine_exercises: owner reads"
  on public.routine_exercises for select to authenticated
  using (exists (select 1 from public.routines r
                 where r.id = routine_id and r.user_id = (select auth.uid())));
create policy "routine_exercises: owner writes"
  on public.routine_exercises for insert to authenticated
  with check (exists (select 1 from public.routines r
                      where r.id = routine_id and r.user_id = (select auth.uid())));
create policy "routine_exercises: owner updates"
  on public.routine_exercises for update to authenticated
  using (exists (select 1 from public.routines r
                 where r.id = routine_id and r.user_id = (select auth.uid())))
  with check (exists (select 1 from public.routines r
                      where r.id = routine_id and r.user_id = (select auth.uid())));
create policy "routine_exercises: owner deletes"
  on public.routine_exercises for delete to authenticated
  using (exists (select 1 from public.routines r
                 where r.id = routine_id and r.user_id = (select auth.uid())));

grant select, insert, update, delete on public.routine_exercises to authenticated;

create index routine_exercises_routine_idx on public.routine_exercises (routine_id, position);

-- ── the weekly plan ──────────────────────────────────────────────────
create table public.routine_days (
  routine_id  uuid not null references public.routines (id) on delete cascade,

  -- ISO: 1 = Monday … 7 = Sunday. A routine can sit on several days.
  weekday     smallint not null check (weekday between 1 and 7),

  primary key (routine_id, weekday)
);

comment on table public.routine_days is
  'Which weekdays a routine is normally done on. The plan is weekly; a session done a day late is still that week''s session.';

alter table public.routine_days enable row level security;

create policy "routine_days: owner reads"
  on public.routine_days for select to authenticated
  using (exists (select 1 from public.routines r
                 where r.id = routine_id and r.user_id = (select auth.uid())));
create policy "routine_days: owner writes"
  on public.routine_days for insert to authenticated
  with check (exists (select 1 from public.routines r
                      where r.id = routine_id and r.user_id = (select auth.uid())));
create policy "routine_days: owner deletes"
  on public.routine_days for delete to authenticated
  using (exists (select 1 from public.routines r
                 where r.id = routine_id and r.user_id = (select auth.uid())));

grant select, insert, delete on public.routine_days to authenticated;

-- ── workouts learn where they came from ──────────────────────────────
alter table public.workouts
  add column routine_id uuid references public.routines (id) on delete set null;

comment on column public.workouts.routine_id is
  'The routine this day was started from, or null for a free session. Set null rather than cascade: deleting a routine must not delete the training done from it.';

-- ── a set can be planned rather than done ────────────────────────────
alter table public.workout_sets
  add column done boolean not null default true;

comment on column public.workout_sets.done is
  'False for a set a routine planned that has not been performed. Defaults true so every set logged before routines existed stays what it was: done.';

-- Every figure Merit reports, volume, the comparison line, the dashboard:
-- counts done sets only. A plan is not an achievement.
create index workout_sets_done_idx on public.workout_sets (user_id, done);

-- ── pausing the plan ─────────────────────────────────────────────────
alter table public.profiles
  add column plan_paused_until date;

comment on column public.profiles.plan_paused_until is
  'While set and in the future, the weekly plan reports nothing as due. A fortnight away is not a fortnight of missed sessions.';

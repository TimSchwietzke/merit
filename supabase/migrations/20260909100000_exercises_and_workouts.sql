-- ─────────────────────────────────────────────────────────────────────
-- exercises, workouts and workout_sets (GOAL.md §7).
--
-- `exercises` is shared like `foods`: if one person adds a lift, everybody has
-- it. `workouts` and `workout_sets` are as private as every other user-scoped
-- table.
--
-- Routines, their exercises and scheduled sessions are the next slice and are
-- not created here. Free logging, picking an exercise without a routine, has
-- to work on its own (GOAL.md §7), so a workout needs nothing from them, and
-- `workouts.routine_id` arrives with the tables it points at.
-- ─────────────────────────────────────────────────────────────────────

create table public.exercises (
  id            uuid primary key default gen_random_uuid(),

  -- Both languages are columns rather than a translations table: the catalogue
  -- ships in exactly two languages and always will (DESIGN.md §9).
  name_en       text not null check (length(btrim(name_en)) between 1 and 120),
  name_de       text not null check (length(btrim(name_de)) between 1 and 120),

  muscle_group  text not null check (muscle_group in
                  ('chest', 'back', 'shoulders', 'arms', 'legs', 'glutes', 'core', 'full_body')),
  equipment     text not null check (equipment in
                  ('barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'band', 'other')),

  -- Schematic illustrations, sourced later. The column exists from day one so
  -- nothing has to migrate when they arrive; it just stays empty (GOAL.md §5).
  image_url     text,

  source        text not null check (source in ('seed', 'community')),
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- The same lift added twice under the same name is a catalogue that gets
  -- worse as it grows.
  unique (name_en, equipment)
);

comment on table public.exercises is
  'The shared exercise catalogue. Readable and extendable by every signed-in user; each row editable only by whoever added it.';

alter table public.exercises enable row level security;

create policy "exercises: any signed-in user reads"
  on public.exercises for select
  to authenticated
  using (true);

create policy "exercises: any signed-in user adds"
  on public.exercises for insert
  to authenticated
  with check (created_by = (select auth.uid()));

-- Only the author edits, and nobody deletes: a shared catalogue anyone can
-- delete from loses somebody else's logged session to a stranger's tidy-up.
create policy "exercises: the author corrects their own"
  on public.exercises for update
  to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

grant select, insert, update on public.exercises to authenticated;

create trigger exercises_set_updated_at
  before update on public.exercises
  for each row execute function public.set_updated_at();

create index exercises_name_en_idx on public.exercises (lower(name_en));
create index exercises_name_de_idx on public.exercises (lower(name_de));

-- ── workouts ─────────────────────────────────────────────────────────
create table public.workouts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,

  -- The day trained, in the user's own timezone (CLAUDE.md, Dates).
  date        date not null,
  notes       text check (length(notes) <= 2000),

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- One workout per day. Two sessions in a day are one day's training, and
  -- splitting them buys nothing the set list does not already show.
  unique (user_id, date)
);

comment on table public.workouts is
  'One training day. Sets hang off it; the exercises come from the shared catalogue.';

alter table public.workouts enable row level security;

create policy "workouts: owner reads own rows"
  on public.workouts for select to authenticated
  using (user_id = (select auth.uid()));
create policy "workouts: owner inserts own rows"
  on public.workouts for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "workouts: owner updates own rows"
  on public.workouts for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "workouts: owner deletes own rows"
  on public.workouts for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.workouts to authenticated;

create trigger workouts_set_updated_at
  before update on public.workouts
  for each row execute function public.set_updated_at();

create index workouts_user_date_idx on public.workouts (user_id, date desc);

-- ── workout_sets ─────────────────────────────────────────────────────
create table public.workout_sets (
  id           uuid primary key default gen_random_uuid(),
  workout_id   uuid not null references public.workouts (id) on delete cascade,

  -- Denormalised from the workout so a policy can be written on this table
  -- without a subquery per row, and so RLS cannot be bypassed by a set whose
  -- workout belongs to somebody else. Kept honest by the trigger below.
  user_id      uuid not null references auth.users (id) on delete cascade,

  exercise_id  uuid not null references public.exercises (id) on delete restrict,

  -- Position within the exercise, not within the session: `3 × 8 @ 60 kg`
  -- counts sets of one lift.
  set_number   integer not null check (set_number between 1 and 99),

  reps         integer not null check (reps between 1 and 1000),

  -- Zero is a real weight: bodyweight dips are a set of dips.
  weight_kg    numeric(6, 2) not null check (weight_kg >= 0 and weight_kg <= 1000),

  -- Reps in reserve. Optional because most people do not track it (GOAL.md §5).
  rir          integer check (rir between 0 and 10),

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  unique (workout_id, exercise_id, set_number)
);

comment on table public.workout_sets is
  'One logged set: exercise, position, reps, weight, and optionally reps in reserve.';

-- The denormalised user_id is set from the workout rather than trusted from the
-- client, so it cannot disagree with the row it hangs off.
create function public.workout_sets_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select w.user_id into new.user_id
  from public.workouts w
  where w.id = new.workout_id;

  if new.user_id is null then
    raise exception 'workout % does not exist', new.workout_id;
  end if;
  return new;
end;
$$;

create trigger workout_sets_set_owner
  before insert or update of workout_id on public.workout_sets
  for each row execute function public.workout_sets_owner();

alter table public.workout_sets enable row level security;

create policy "workout_sets: owner reads own rows"
  on public.workout_sets for select to authenticated
  using (user_id = (select auth.uid()));
create policy "workout_sets: owner inserts own rows"
  on public.workout_sets for insert to authenticated
  with check (
    exists (select 1 from public.workouts w
            where w.id = workout_id and w.user_id = (select auth.uid()))
  );
create policy "workout_sets: owner updates own rows"
  on public.workout_sets for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "workout_sets: owner deletes own rows"
  on public.workout_sets for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.workout_sets to authenticated;

create trigger workout_sets_set_updated_at
  before update on public.workout_sets
  for each row execute function public.set_updated_at();

-- "What did I do last time for this exercise" walks back through this.
create index workout_sets_user_exercise_idx
  on public.workout_sets (user_id, exercise_id, created_at desc);
create index workout_sets_workout_idx on public.workout_sets (workout_id);

-- ── a catalogue to start from ────────────────────────────────────────
-- Without these the first person to open the training tab is asked to type in
-- the name of every lift they do before they can log anything. They are
-- `source = 'seed'` and have no `created_by`, so nobody owns them and the
-- author-only update policy leaves them alone.
insert into public.exercises (name_en, name_de, muscle_group, equipment, source)
values
  ('Barbell back squat', 'Kniebeuge mit Langhantel', 'legs', 'barbell', 'seed'),
  ('Front squat', 'Frontkniebeuge', 'legs', 'barbell', 'seed'),
  ('Leg press', 'Beinpresse', 'legs', 'machine', 'seed'),
  ('Romanian deadlift', 'Rumänisches Kreuzheben', 'legs', 'barbell', 'seed'),
  ('Deadlift', 'Kreuzheben', 'back', 'barbell', 'seed'),
  ('Leg curl', 'Beinbeuger', 'legs', 'machine', 'seed'),
  ('Leg extension', 'Beinstrecker', 'legs', 'machine', 'seed'),
  ('Calf raise', 'Wadenheben', 'legs', 'machine', 'seed'),
  ('Hip thrust', 'Hip Thrust', 'glutes', 'barbell', 'seed'),
  ('Bench press', 'Bankdrücken', 'chest', 'barbell', 'seed'),
  ('Incline bench press', 'Schrägbankdrücken', 'chest', 'barbell', 'seed'),
  ('Dumbbell bench press', 'Kurzhantel-Bankdrücken', 'chest', 'dumbbell', 'seed'),
  ('Chest fly', 'Fliegende', 'chest', 'cable', 'seed'),
  ('Push-up', 'Liegestütz', 'chest', 'bodyweight', 'seed'),
  ('Dip', 'Dip', 'chest', 'bodyweight', 'seed'),
  ('Pull-up', 'Klimmzug', 'back', 'bodyweight', 'seed'),
  ('Lat pulldown', 'Latzug', 'back', 'cable', 'seed'),
  ('Barbell row', 'Langhantelrudern', 'back', 'barbell', 'seed'),
  ('Seated cable row', 'Rudern am Kabel', 'back', 'cable', 'seed'),
  ('Dumbbell row', 'Kurzhantelrudern', 'back', 'dumbbell', 'seed'),
  ('Overhead press', 'Schulterdrücken', 'shoulders', 'barbell', 'seed'),
  ('Dumbbell shoulder press', 'Kurzhantel-Schulterdrücken', 'shoulders', 'dumbbell', 'seed'),
  ('Lateral raise', 'Seitheben', 'shoulders', 'dumbbell', 'seed'),
  ('Rear delt fly', 'Reverse Fliegende', 'shoulders', 'dumbbell', 'seed'),
  ('Face pull', 'Face Pull', 'shoulders', 'cable', 'seed'),
  ('Barbell curl', 'Langhantelcurl', 'arms', 'barbell', 'seed'),
  ('Dumbbell curl', 'Kurzhantelcurl', 'arms', 'dumbbell', 'seed'),
  ('Hammer curl', 'Hammercurl', 'arms', 'dumbbell', 'seed'),
  ('Triceps pushdown', 'Trizepsdrücken am Kabel', 'arms', 'cable', 'seed'),
  ('Skull crusher', 'Stirndrücken', 'arms', 'barbell', 'seed'),
  ('Plank', 'Unterarmstütz', 'core', 'bodyweight', 'seed'),
  ('Hanging leg raise', 'Hängendes Beinheben', 'core', 'bodyweight', 'seed'),
  ('Cable crunch', 'Crunch am Kabel', 'core', 'cable', 'seed'),
  ('Kettlebell swing', 'Kettlebell Swing', 'full_body', 'kettlebell', 'seed')
on conflict (name_en, equipment) do nothing;

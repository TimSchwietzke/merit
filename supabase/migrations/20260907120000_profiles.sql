-- ─────────────────────────────────────────────────────────────────────
-- profiles, one row per auth user.
--
-- The first user-scoped table, so it sets the pattern the rest follow:
-- a `user_id` referencing auth.users, RLS enabled, and a policy per verb
-- keyed on `user_id = auth.uid()` (CLAUDE.md hard rule 2, GOAL.md §7).
--
-- Sign-up is closed. Users are created by hand in the Supabase dashboard for
-- the MVP (GOAL.md §3), so the row is created by a trigger on auth.users
-- rather than by the client.
-- ─────────────────────────────────────────────────────────────────────

create table public.profiles (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  display_name   text,

  -- Mirrors the client-side preferences so they follow the user between
  -- devices. The browser is only the fallback until this row is read.
  locale         text not null default 'de'     check (locale in ('de', 'en')),
  theme          text not null default 'system' check (theme in ('light', 'dark', 'system')),

  -- Inputs to the calculated calorie target (GOAL.md §5). All nullable: the
  -- user can set a target manually and never fill any of this in.
  height_cm      numeric(4, 1) check (height_cm > 0 and height_cm < 300),
  birth_date     date          check (birth_date > date '1900-01-01'),
  sex            text          check (sex in ('female', 'male')),
  activity_level text          check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  goal           text          check (goal in ('lose', 'maintain', 'gain')),

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.profiles is
  'Per-user settings and the inputs to the calculated calorie target. One row per auth user, created by trigger.';

alter table public.profiles enable row level security;

-- Every user sees only their own row (GOAL.md §3). No policy is broader than
-- one user, and `authenticated` is named explicitly so `anon` never matches.
create policy "profiles: owner reads own row"
  on public.profiles for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "profiles: owner updates own row"
  on public.profiles for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- No insert policy: the trigger below owns creation, and it runs as definer.
-- No delete policy: account deletion removes the auth user and the cascade
-- takes the profile with it (GOAL.md §8).

grant select, update on public.profiles to authenticated;

-- ── updated_at ───────────────────────────────────────────────────────
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ── profile creation ─────────────────────────────────────────────────
-- security definer because auth.users is not writable by the app roles and
-- the new user has no session yet. search_path is pinned to empty and every
-- name below is schema-qualified, or a definer function becomes an escalation
-- path via a shadowed table name.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users created before this migration ran still need a row.
insert into public.profiles (user_id)
select id from auth.users
on conflict (user_id) do nothing;

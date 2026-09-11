-- ─────────────────────────────────────────────────────────────────────
-- Erasure, Art. 17, and the way consent is withdrawn under Art. 7(3).
--
-- Every user-scoped table references `auth.users` with `on delete cascade`, so
-- removing the account row removes the profile, the weigh-ins, the food log,
-- the workouts, the sets, the routines and the schedule with it. What a client
-- cannot do is delete from `auth.users`: that schema is not exposed through
-- PostgREST and no anon or authenticated role may touch it.
--
-- So this is `security definer`, and it is written to be incapable of deleting
-- anybody else: the id is not a parameter. There is nothing for a caller to
-- pass and therefore nothing to get wrong. `search_path = ''` with every name
-- fully qualified, because a definer function that resolves names through a
-- caller-controlled path is the classic way to hand out the owner's rights.
--
-- **The shared catalogue is deliberately not deleted.** A food or an exercise
-- somebody added belongs to the group's catalogue, not to them, that is the
-- point of it growing itself (GOAL.md §3), and those rows carry `created_by`
-- with `on delete set null`, so they survive without naming anybody. The
-- privacy notice says so, because a promise to delete everything has to be
-- true.
-- ─────────────────────────────────────────────────────────────────────

create function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null then
    raise exception 'not signed in';
  end if;

  delete from auth.users where id = caller;
end;
$$;

comment on function public.delete_own_account() is
  'Erases the calling account and, by cascade, everything scoped to it. Takes no arguments on purpose.';

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;

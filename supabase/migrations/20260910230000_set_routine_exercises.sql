-- ─────────────────────────────────────────────────────────────────────
-- Saving a routine's exercises in one write.
--
-- The editor holds a draft now, you can rename, reorder, retype the reps and
-- drop a lift, and none of it is written until you say so, which is what makes
-- a cancel button mean anything. Four round trips per save could half-apply on
-- a gym connection and leave a routine holding neither the old list nor the new
-- one, and the `(routine_id, position)` uniqueness is deferred to the end of a
-- *transaction*, which two PostgREST calls are not.
--
-- So the whole list goes over at once and is replaced inside one statement.
-- Wholesale rather than diffed: the rows carry no identity anybody outside this
-- table refers to, starting a routine copies its plan onto the workout, and a
-- diff is more code than the writes it saves.
-- ─────────────────────────────────────────────────────────────────────

create function public.set_routine_exercises(routine uuid, items jsonb)
returns void
language plpgsql
-- Invoker, so the delete and the insert below answer to the owner's RLS
-- policies exactly as they would from the client. A definer function here would
-- be a way to write into somebody else's routine.
security invoker
set search_path = ''
as $$
begin
  delete from public.routine_exercises where routine_id = routine;

  insert into public.routine_exercises (routine_id, exercise_id, position, set_reps)
  select routine,
         (entry.item ->> 'exercise_id')::uuid,
         (entry.ordinality - 1)::int,
         (select array_agg(reps::smallint order by ord)
            from jsonb_array_elements_text(entry.item -> 'set_reps')
                 with ordinality as r(reps, ord))
    from jsonb_array_elements(items) with ordinality as entry(item, ordinality);
end;
$$;

comment on function public.set_routine_exercises(uuid, jsonb) is
  'Replace a routine''s exercises with the given list, in order, in one transaction.';

grant execute on function public.set_routine_exercises(uuid, jsonb) to authenticated;

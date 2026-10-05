-- ─────────────────────────────────────────────────────────────────────
-- Saving a logged meal as a recipe.
--
-- The recipe and its ingredients are written in one transaction, so a bad
-- connection or a refused amount cannot leave half a recipe in the list.
--
-- Additive only: one new function, no table or column changes.
-- ─────────────────────────────────────────────────────────────────────

-- items: [{"food_id": uuid, "quantity_g": number}, ...], in the order the
-- recipe lists them. meal: the meal's name as the user reads it, capitalised
-- ('Snack', 'Frühstück'); only used when name is empty, trimmed, and then
-- required to be non-blank.
--
-- An empty name becomes "<meal> #<n>": one more than the highest n among the
-- caller's recipes named exactly "<meal> #n", ignoring case, n a positive
-- integer without leading zeros. Compared by prefix and suffix, not by a
-- pattern built from meal, so whatever the meal is called cannot break it.
create function public.save_recipe(name text, meal text, items jsonb)
returns public.recipes
language plpgsql
-- Invoker: every read and write below answers to the caller's RLS, so the
-- numbering only ever sees the caller's own recipes.
security invoker
set search_path = ''
as $$
declare
  final text := coalesce(trim(name), '');
  prefix text := trim(meal) || ' #';
  highest numeric;
  created public.recipes%rowtype;
begin
  if jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items) = 0 then
    raise exception 'a recipe needs at least one item';
  end if;

  if final = '' then
    if coalesce(trim(meal), '') = '' then
      raise exception 'an unnamed recipe needs a meal to be named after';
    end if;

    -- numeric, not int: a recipe somebody named "Snack #99999999999" must
    -- not make the cast fail.
    select max(substr(trim(r.name), length(prefix) + 1)::numeric) into highest
      from public.recipes r
     where lower(left(trim(r.name), length(prefix))) = lower(prefix)
       and substr(trim(r.name), length(prefix) + 1) ~ '^[1-9][0-9]*$';
    final := prefix || (coalesce(highest, 0) + 1);
  end if;

  insert into public.recipes (user_id, name)
  values ((select auth.uid()), final)
  returning * into created;

  -- A microsecond apart, as log_recipe does, so the recipe lists them in the
  -- order given rather than at random. Any amount the column refuses (over
  -- 10000 g, zero) fails the whole call, recipe included.
  insert into public.recipe_items (recipe_id, food_id, quantity_g, created_at)
  select created.id, (item ->> 'food_id')::uuid, (item ->> 'quantity_g')::numeric,
         now() + ord * interval '1 microsecond'
    from jsonb_array_elements(items) with ordinality as list (item, ord);

  return created;
end;
$$;

revoke execute on function public.save_recipe(text, text, jsonb) from public, anon;
grant execute on function public.save_recipe(text, text, jsonb) to authenticated;

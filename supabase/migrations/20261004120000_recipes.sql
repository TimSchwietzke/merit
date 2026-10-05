-- ─────────────────────────────────────────────────────────────────────
-- Recipes: a protein shake, a skyr bowl, a pot of pasta.
--
-- A recipe is a list of foods with amounts. Logging one writes each
-- ingredient into food_logs as an ordinary row, scaled to the portion, and
-- ties the rows together under one logged_recipes line. So a day's totals
-- still come from real foods only, one ingredient can be changed for that
-- day alone, and editing the recipe later leaves past days as they were eaten.
--
-- A portion is a share of the whole: twice the shake, an eighth of the pot.
-- Not grams: the ingredients are weighed raw, and a cooked pot weighs more
-- than they add up to, so grams off the plate would overcount.
--
-- Additive only: two new tables, one new table for the logged line, and a
-- nullable column on food_logs that every existing row leaves empty.
-- ─────────────────────────────────────────────────────────────────────

create table public.recipes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null check (length(trim(name)) between 1 and 120),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.recipes enable row level security;

create policy "recipes: owner reads own rows" on public.recipes for select
  to authenticated using (user_id = (select auth.uid()));
create policy "recipes: owner inserts own rows" on public.recipes for insert
  to authenticated with check (user_id = (select auth.uid()));
create policy "recipes: owner updates own rows" on public.recipes for update
  to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "recipes: owner deletes own rows" on public.recipes for delete
  to authenticated using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.recipes to authenticated;

create trigger recipes_set_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();

create index recipes_user_idx on public.recipes (user_id);


create table public.recipe_items (
  id          uuid primary key default gen_random_uuid(),
  recipe_id   uuid not null references public.recipes (id) on delete cascade,
  -- restrict, as on food_logs: a food under a recipe must not vanish.
  food_id     uuid not null references public.foods (id) on delete restrict,
  quantity_g  numeric(7, 1) not null check (quantity_g > 0 and quantity_g <= 10000),
  created_at  timestamptz not null default now()
);

alter table public.recipe_items enable row level security;

-- Owned through the recipe. The check on insert and update is what stops an
-- item being hung under somebody else's recipe.
create policy "recipe_items: owner reads own rows" on public.recipe_items for select
  to authenticated using (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = (select auth.uid())));
create policy "recipe_items: owner inserts own rows" on public.recipe_items for insert
  to authenticated with check (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = (select auth.uid())));
create policy "recipe_items: owner updates own rows" on public.recipe_items for update
  to authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = (select auth.uid())))
  with check (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = (select auth.uid())));
create policy "recipe_items: owner deletes own rows" on public.recipe_items for delete
  to authenticated using (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = (select auth.uid())));

grant select, insert, update, delete on public.recipe_items to authenticated;

create index recipe_items_recipe_idx on public.recipe_items (recipe_id);


create table public.logged_recipes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  date        date not null,
  meal_type   text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  -- set null: deleting a recipe must not touch the days it was eaten on. The
  -- name is copied for the same reason, and survives a rename.
  recipe_id   uuid references public.recipes (id) on delete set null,
  name        text not null check (length(trim(name)) between 1 and 120),
  -- The share of the recipe eaten: 0.125 for an eighth, 2 for a double shake.
  factor      numeric(8, 5) not null check (factor > 0 and factor <= 100),
  -- The parts as typed, when the portion was given as parts: 2 of 8 stays
  -- 2 of 8 and does not come back as 1/4. Null for the whole recipe (×).
  parts_eaten smallint,
  parts_total smallint,
  -- Both or neither, in range, and the share theirs: so the two cannot
  -- disagree whichever way a row is written, not only through the RPCs.
  constraint logged_recipes_parts check (
    (parts_eaten is null) = (parts_total is null)
    and (parts_eaten is null or (
      parts_eaten between 1 and parts_total
      and parts_total <= 100
      and factor = round(parts_eaten::numeric / parts_total, 5)
    ))
  ),
  created_at  timestamptz not null default now()
);

alter table public.logged_recipes enable row level security;

create policy "logged_recipes: owner reads own rows" on public.logged_recipes for select
  to authenticated using (user_id = (select auth.uid()));
create policy "logged_recipes: owner inserts own rows" on public.logged_recipes for insert
  to authenticated with check (user_id = (select auth.uid()));
create policy "logged_recipes: owner updates own rows" on public.logged_recipes for update
  to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "logged_recipes: owner deletes own rows" on public.logged_recipes for delete
  to authenticated using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.logged_recipes to authenticated;

create index logged_recipes_user_date_idx on public.logged_recipes (user_id, date);


-- The pair, not the id alone: an entry can only hang under a line of its own
-- user's, whatever ids somebody guesses. Removing the line removes its
-- ingredients with it.
alter table public.logged_recipes add constraint logged_recipes_id_user_key unique (id, user_id);

alter table public.food_logs add column group_id uuid;

-- The ingredient's amount in one whole recipe, unrounded. quantity_g is the
-- portion, kept to the column's 0.1 g; a new portion is computed from this,
-- never from the last rounded result, so changing it back and forth does not
-- drift. Set when a recipe is logged, and when one ingredient is corrected for
-- the day (its new amount over the line's factor). Null on a plain entry.
alter table public.food_logs add column recipe_g numeric check (recipe_g > 0);
-- An ingredient without its base would be rescaled from nothing: refused.
-- Every existing row has no group, so this holds for them as it is.
alter table public.food_logs
  add constraint food_logs_ingredient_has_base check (group_id is null or recipe_g is not null);
alter table public.food_logs
  add constraint food_logs_group_fkey foreign key (group_id, user_id)
  references public.logged_recipes (id, user_id) on delete cascade;

create index food_logs_group_idx on public.food_logs (group_id) where group_id is not null;


-- Logging a recipe is several rows, written in one transaction so a bad
-- connection cannot leave half a shake in the day.
-- Given parts, the share is theirs: factor is ignored and computed, so the
-- two can never disagree.
create function public.log_recipe(
  recipe uuid, day date, meal text, factor numeric,
  eaten smallint default null, total smallint default null
)
returns uuid
language plpgsql
-- Invoker: every read and write below answers to the caller's RLS.
security invoker
set search_path = ''
as $$
declare
  source public.recipes%rowtype;
  share numeric := case when total is not null then eaten::numeric / total else factor end;
  line uuid;
begin
  select * into source from public.recipes where id = recipe;
  if source.id is null then
    raise exception 'recipe not found';
  end if;

  insert into public.logged_recipes (user_id, date, meal_type, recipe_id, name, factor, parts_eaten, parts_total)
  values ((select auth.uid()), day, meal, source.id, source.name, share, eaten, total)
  returning id into line;

  -- Rounded to the column's 0.1 g, and never below it: an eighth of a pinch of
  -- salt is still in the pot, and the column refuses zero. A microsecond apart,
  -- so the day lists them in the recipe's order rather than at random.
  insert into public.food_logs (user_id, date, meal_type, food_id, quantity_g, recipe_g, group_id, created_at)
  select (select auth.uid()), day, meal, item.food_id,
         greatest(round(item.quantity_g * share, 1), 0.1), item.quantity_g, line,
         now() + (row_number() over (order by item.created_at)) * interval '1 microsecond'
    from public.recipe_items item
   where item.recipe_id = source.id;

  return line;
end;
$$;

grant execute on function public.log_recipe(uuid, date, text, numeric, smallint, smallint) to authenticated;


-- Changing a logged line's portion or meal: every row is recomputed from its
-- recipe_g, so an ingredient corrected for that day stays corrected in
-- proportion, and the meal moves with the line. One transaction, as above.
create function public.update_logged_recipe(
  line uuid, factor numeric, meal text,
  eaten smallint default null, total smallint default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  share numeric := case when total is not null then eaten::numeric / total else factor end;
begin
  update public.logged_recipes l
     set factor = share, meal_type = meal, parts_eaten = eaten, parts_total = total
   where l.id = line;
  if not found then
    raise exception 'logged recipe not found';
  end if;

  update public.food_logs f
     set quantity_g = least(greatest(round(f.recipe_g * share, 1), 0.1), 10000),
         meal_type = meal
   where f.group_id = line;
end;
$$;

grant execute on function public.update_logged_recipe(uuid, numeric, text, smallint, smallint) to authenticated;

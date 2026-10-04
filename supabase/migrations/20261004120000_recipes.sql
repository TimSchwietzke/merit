-- ─────────────────────────────────────────────────────────────────────
-- Recipes: a protein shake, a skyr bowl, a pot of pasta.
--
-- A recipe is a list of foods with amounts. Logging one writes each
-- ingredient into food_logs as an ordinary row, scaled to the portion, and
-- ties the rows together under one logged_recipes line. So a day's totals
-- still come from real foods only, one ingredient can be changed for that
-- day alone, and editing the recipe later leaves past days as they were eaten.
--
-- total_g is the whole recipe's weight once made (the cooked pot). With it a
-- portion can be given in grams; without it only as a share.
--
-- Additive only: two new tables, one new table for the logged line, and a
-- nullable column on food_logs that every existing row leaves empty.
-- ─────────────────────────────────────────────────────────────────────

create table public.recipes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null check (length(trim(name)) between 1 and 120),
  total_g     numeric(7, 1) check (total_g > 0),
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
  -- The share of the recipe eaten (0.125 for an eighth, 2 for a double shake),
  -- and the grams it was given in, when it was given in grams.
  factor      numeric(8, 5) not null check (factor > 0 and factor <= 100),
  grams       numeric(7, 1) check (grams > 0),
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
alter table public.food_logs
  add constraint food_logs_group_fkey foreign key (group_id, user_id)
  references public.logged_recipes (id, user_id) on delete cascade;

create index food_logs_group_idx on public.food_logs (group_id) where group_id is not null;


-- Logging a recipe is several rows, written in one transaction so a bad
-- connection cannot leave half a shake in the day.
create function public.log_recipe(recipe uuid, day date, meal text, factor numeric, grams numeric default null)
returns uuid
language plpgsql
-- Invoker: every read and write below answers to the caller's RLS.
security invoker
set search_path = ''
as $$
declare
  source public.recipes%rowtype;
  share numeric := factor;
  line uuid;
begin
  select * into source from public.recipes where id = recipe;
  if source.id is null then
    raise exception 'recipe not found';
  end if;

  -- Grams are a share of the made weight, which only a recipe with one has.
  if grams is not null then
    if source.total_g is null then
      raise exception 'recipe has no total weight';
    end if;
    share := grams / source.total_g;
  end if;

  insert into public.logged_recipes (user_id, date, meal_type, recipe_id, name, factor, grams)
  values ((select auth.uid()), day, meal, source.id, source.name, share, grams)
  returning id into line;

  -- Rounded to the column's 0.1 g, and never below it: an eighth of a pinch of
  -- salt is still in the pot, and the column refuses zero.
  insert into public.food_logs (user_id, date, meal_type, food_id, quantity_g, group_id)
  select (select auth.uid()), day, meal, item.food_id,
         greatest(round(item.quantity_g * share, 1), 0.1), line
    from public.recipe_items item
   where item.recipe_id = source.id
   order by item.created_at;

  return line;
end;
$$;

grant execute on function public.log_recipe(uuid, date, text, numeric, numeric) to authenticated;

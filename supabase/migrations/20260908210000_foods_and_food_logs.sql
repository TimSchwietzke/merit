-- ─────────────────────────────────────────────────────────────────────
-- foods and food_logs (GOAL.md §7).
--
-- Two tables with deliberately different reach. `foods` is the shared
-- catalogue: if one person adds a product, everybody has it, and that is what
-- makes the catalogue grow by itself (GOAL.md §3). `food_logs` is as private as
-- every other user-scoped table.
--
-- Nutrition values live here once and are referenced, never copied into a log
-- row. A log row is a food, a day, a meal and a quantity; the numbers come from
-- the join. Copying them would mean a corrected product silently disagreeing
-- with every meal already logged from it.
-- ─────────────────────────────────────────────────────────────────────

create table public.foods (
  id                  uuid primary key default gen_random_uuid(),

  -- Unique so a barcode resolves to one product, nullable because whole foods
  -- (a banana, chicken breast) have none. Every resolved lookup is cached here
  -- so the same barcode never hits an external API twice (CLAUDE.md).
  barcode             text unique check (barcode ~ '^[0-9]{8,14}$'),

  name                text not null check (length(btrim(name)) between 1 and 200),
  brand               text check (length(btrim(brand)) between 1 and 120),

  -- Everything is per 100 g / 100 ml (GOAL.md §5). The four that carry user-set
  -- targets are required: a food with no energy value is not a food anyone can
  -- log against a calorie budget.
  kcal_100g           numeric(7, 2) not null check (kcal_100g >= 0 and kcal_100g <= 1000),
  fat_100g            numeric(6, 2) not null check (fat_100g >= 0 and fat_100g <= 100),
  carbs_100g          numeric(6, 2) not null check (carbs_100g >= 0 and carbs_100g <= 100),
  protein_100g        numeric(6, 2) not null check (protein_100g >= 0 and protein_100g <= 100),

  -- The rest of the EU mandatory declaration, plus fibre. Nullable on purpose
  -- and never defaulted to zero: a food that carries no fibre value has no
  -- fibre value, and summing it as nothing is the most misleading thing this
  -- app could do (GOAL.md §4, DESIGN.md §10.10).
  saturated_fat_100g  numeric(6, 2) check (saturated_fat_100g >= 0 and saturated_fat_100g <= 100),
  sugars_100g         numeric(6, 2) check (sugars_100g >= 0 and sugars_100g <= 100),
  fibre_100g          numeric(6, 2) check (fibre_100g >= 0 and fibre_100g <= 100),
  salt_100g           numeric(6, 3) check (salt_100g >= 0 and salt_100g <= 100),

  -- Vitamins and minerals where a source provides them. Stored, not shown:
  -- Open Food Facts coverage is too patchy to build a daily target on.
  micros              jsonb,

  -- Both or neither: a serving label with no weight cannot be logged, and a
  -- weight with no label has nothing to put on a button.
  serving_size_g      numeric(6, 1) check (serving_size_g > 0 and serving_size_g <= 5000),
  serving_label       text check (length(btrim(serving_label)) between 1 and 60),
  constraint foods_serving_is_complete
    check ((serving_size_g is null) = (serving_label is null)),

  source              text not null check (source in ('off', 'usda', 'community')),

  -- Null once the account that added it is deleted; the food stays, because it
  -- belongs to the catalogue rather than to the person who happened to scan it.
  created_by          uuid references auth.users (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.foods is
  'The shared food catalogue. Readable and extendable by every signed-in user; each row editable only by whoever added it.';

-- Sub-values cannot exceed the total they are part of.
alter table public.foods
  add constraint foods_saturates_within_fat
    check (saturated_fat_100g is null or saturated_fat_100g <= fat_100g),
  add constraint foods_sugars_within_carbs
    check (sugars_100g is null or sugars_100g <= carbs_100g);

alter table public.foods enable row level security;

-- Shared, and only in the two directions GOAL.md §7 names. Read and insert are
-- open to every signed-in user; a row is editable only by whoever added it, so
-- one person cannot rewrite the values under everybody else's logged meals.
create policy "foods: any signed-in user reads"
  on public.foods for select
  to authenticated
  using (true);

create policy "foods: any signed-in user adds"
  on public.foods for insert
  to authenticated
  with check (created_by = (select auth.uid()));

create policy "foods: the author corrects their own"
  on public.foods for update
  to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

-- No delete policy at all. A catalogue anyone can delete from is a catalogue
-- that loses somebody else's logged meal to a stranger's tidy-up.

grant select, insert, update on public.foods to authenticated;

create trigger foods_set_updated_at
  before update on public.foods
  for each row execute function public.set_updated_at();

-- Search is by name, case- and accent-insensitively, over a few thousand rows.
create index foods_name_idx on public.foods (lower(name));

-- ── food_logs ────────────────────────────────────────────────────────
create table public.food_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,

  -- The day the food was eaten, in the user's own timezone. Not a timestamp:
  -- a meal logged at 23:30 belongs to that day (CLAUDE.md, Dates).
  date        date not null,
  meal_type   text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),

  -- restrict, not cascade: deleting a food out from under a logged meal would
  -- silently change a day's totals. There is no delete policy on foods anyway;
  -- this is the constraint that keeps that true if one is ever added.
  food_id     uuid not null references public.foods (id) on delete restrict,

  -- Grams or millilitres, since every food is stored per 100 of them.
  quantity_g  numeric(7, 1) not null check (quantity_g > 0 and quantity_g <= 10000),

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.food_logs is
  'One logged portion: a food, a day, a meal and a quantity. Nutrition values are referenced from foods, never copied.';

alter table public.food_logs enable row level security;

create policy "food_logs: owner reads own rows"
  on public.food_logs for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "food_logs: owner inserts own rows"
  on public.food_logs for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "food_logs: owner updates own rows"
  on public.food_logs for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "food_logs: owner deletes own rows"
  on public.food_logs for delete
  to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.food_logs to authenticated;

create trigger food_logs_set_updated_at
  before update on public.food_logs
  for each row execute function public.set_updated_at();

-- Every query this table serves is "my rows, one day, in meal order".
create index food_logs_user_date_idx on public.food_logs (user_id, date);

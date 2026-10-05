-- `npm run db:test`: save_recipe writes a recipe and its items in one go,
-- numbers an unnamed one after the caller's own, and leaves nothing behind
-- when it fails. Runs in a transaction and rolls back, so it leaves the local
-- database as it found it.
begin;
select plan(18);

-- Two users. The trigger gives each a profile.
insert into auth.users (id, aud, role, email) values
  ('5a7e0000-0000-0000-0000-0000000000a1', 'authenticated', 'authenticated', 'sa@test.local'),
  ('5a7e0000-0000-0000-0000-0000000000b2', 'authenticated', 'authenticated', 'sb@test.local');

insert into public.foods (id, name, source, kcal_100g, fat_100g, carbs_100g, protein_100g) values
  ('5a7e0000-0000-0000-0000-00000000f001', 'Skyr', 'community', 63, 0.2, 4, 11),
  ('5a7e0000-0000-0000-0000-00000000f002', 'Haferflocken', 'community', 372, 7, 59, 13.5),
  ('5a7e0000-0000-0000-0000-00000000f003', 'Salz', 'community', 0, 0, 0, 0);

-- As B: a recipe A must neither count nor see.
set local role authenticated;
set local request.jwt.claims = '{"sub": "5a7e0000-0000-0000-0000-0000000000b2", "role": "authenticated"}';
insert into public.recipes (user_id, name) values ('5a7e0000-0000-0000-0000-0000000000b2', 'Snack #40');

-- As A.
set local request.jwt.claims = '{"sub": "5a7e0000-0000-0000-0000-0000000000a1", "role": "authenticated"}';

-- A typed name, trimmed; amounts kept to 0.1 g; items in the order given.
select id as bowl from public.save_recipe('  Skyr bowl  ', 'Snack', '[
  {"food_id": "5a7e0000-0000-0000-0000-00000000f002", "quantity_g": 62.5},
  {"food_id": "5a7e0000-0000-0000-0000-00000000f001", "quantity_g": 250},
  {"food_id": "5a7e0000-0000-0000-0000-00000000f003", "quantity_g": 0.3}
]') \gset

select is((select name from public.recipes where id = :'bowl'), 'Skyr bowl', 'a typed name is saved trimmed');
select results_eq(
  format($$ select food_id, quantity_g from public.recipe_items where recipe_id = %L order by created_at $$, :'bowl'),
  $$ values ('5a7e0000-0000-0000-0000-00000000f002'::uuid, 62.5::numeric),
            ('5a7e0000-0000-0000-0000-00000000f001'::uuid, 250::numeric),
            ('5a7e0000-0000-0000-0000-00000000f003'::uuid, 0.3::numeric) $$,
  'every item is saved with its amount, unrounded, in the order given');

-- No name: B's "Snack #40" does not count, so this is the first.
select is(
  (select name from public.save_recipe('', 'Snack', '[{"food_id": "5a7e0000-0000-0000-0000-00000000f001", "quantity_g": 100}]')),
  'Snack #1', 'an empty name gives "<meal> #1", another user''s recipes not counted');
select is(
  (select name from public.save_recipe('   ', 'Frühstück', '[{"food_id": "5a7e0000-0000-0000-0000-00000000f001", "quantity_g": 100}]')),
  'Frühstück #1', 'a name of spaces counts as empty');
select is(
  (select name from public.save_recipe(null, 'Frühstück', '[{"food_id": "5a7e0000-0000-0000-0000-00000000f001", "quantity_g": 100}]')),
  'Frühstück #2', 'a missing name counts as empty, and numbering continues');

-- The highest match counts, whatever its case or surrounding spaces.
insert into public.recipes (user_id, name) values
  ('5a7e0000-0000-0000-0000-0000000000a1', 'Snack #2'),
  ('5a7e0000-0000-0000-0000-0000000000a1', '  snack #5 '),
  -- None of these are "<meal> #N".
  ('5a7e0000-0000-0000-0000-0000000000a1', 'Snack #02'),
  ('5a7e0000-0000-0000-0000-0000000000a1', 'Snack #0'),
  ('5a7e0000-0000-0000-0000-0000000000a1', 'Snack #3 alt'),
  ('5a7e0000-0000-0000-0000-0000000000a1', 'Snack #-9'),
  ('5a7e0000-0000-0000-0000-0000000000a1', 'Snack #7.5'),
  ('5a7e0000-0000-0000-0000-0000000000a1', 'Snack  #8'),
  ('5a7e0000-0000-0000-0000-0000000000a1', 'Snacks #9'),
  ('5a7e0000-0000-0000-0000-0000000000a1', 'Abend Snack #10');
select is(
  (select name from public.save_recipe('', 'Snack', '[{"food_id": "5a7e0000-0000-0000-0000-00000000f001", "quantity_g": 100}]')),
  'Snack #6', 'the next number follows the highest, ignoring case; near misses do not count');

-- A meal name with pattern characters is taken literally.
insert into public.recipes (user_id, name) values
  ('5a7e0000-0000-0000-0000-0000000000a1', 'A.c* #4'),
  ('5a7e0000-0000-0000-0000-0000000000a1', 'Abcc #9');
select is(
  (select name from public.save_recipe('', 'A.c*', '[{"food_id": "5a7e0000-0000-0000-0000-00000000f001", "quantity_g": 100}]')),
  'A.c* #5', 'the meal name is compared literally, not as a pattern');

-- A huge number in a name does not break the count.
insert into public.recipes (user_id, name) values
  ('5a7e0000-0000-0000-0000-0000000000a1', 'Abend #99999999999');
select is(
  (select name from public.save_recipe('', 'Abend', '[{"food_id": "5a7e0000-0000-0000-0000-00000000f001", "quantity_g": 100}]')),
  'Abend #100000000000', 'a number beyond int still counts');

-- Case is ignored beyond ASCII too.
insert into public.recipes (user_id, name) values
  ('5a7e0000-0000-0000-0000-0000000000a1', 'FRÜHSTÜCK #3');
select is(
  (select name from public.save_recipe('', 'Frühstück', '[{"food_id": "5a7e0000-0000-0000-0000-00000000f001", "quantity_g": 100}]')),
  'Frühstück #4', 'case is ignored for non-ASCII letters');

-- A padded meal is trimmed before naming and matching.
select is(
  (select name from public.save_recipe('', ' Snack ', '[{"food_id": "5a7e0000-0000-0000-0000-00000000f001", "quantity_g": 100}]')),
  'Snack #7', 'a padded meal is trimmed');

-- Failing: nothing is left behind.
select (select count(*) from public.recipes) as before, (select count(*) from public.recipe_items) as before_items \gset
select throws_ok(
  $$ select public.save_recipe('Zu viel', 'Snack', '[
       {"food_id": "5a7e0000-0000-0000-0000-00000000f001", "quantity_g": 100},
       {"food_id": "5a7e0000-0000-0000-0000-00000000f002", "quantity_g": 10000.1}
     ]') $$,
  '23514', null, 'an item over 10000 g fails the whole call');
select throws_ok(
  $$ select public.save_recipe('Unbekannt', 'Snack', '[{"food_id": "5a7e0000-0000-0000-0000-00000000ffff", "quantity_g": 100}]') $$,
  '23503', null, 'an unknown food fails the whole call');
select throws_like(
  $$ select public.save_recipe('Leer', 'Snack', '[]') $$,
  '%at least one item%', 'a recipe without items is refused');
select throws_like(
  $$ select public.save_recipe('', '  ', '[{"food_id": "5a7e0000-0000-0000-0000-00000000f001", "quantity_g": 100}]') $$,
  '%needs a meal%', 'an unnamed recipe with a blank meal is refused');
select throws_like(
  $$ select public.save_recipe(null, null, '[{"food_id": "5a7e0000-0000-0000-0000-00000000f001", "quantity_g": 100}]') $$,
  '%needs a meal%', 'an unnamed recipe with no meal is refused');
select is((select count(*) from public.recipes)::int, :before::int, 'no recipe is left behind by a failed call');
select is((select count(*) from public.recipe_items)::int, :before_items::int, 'and no item');

-- As B: none of A's.
set local request.jwt.claims = '{"sub": "5a7e0000-0000-0000-0000-0000000000b2", "role": "authenticated"}';
select is((select array_agg(name) from public.recipes), array['Snack #40'], 'B sees only B''s own recipe');

select * from finish();
rollback;

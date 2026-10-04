-- `npx supabase test db`: log_recipe scales, refuses what it should, and
-- keeps one user's recipes away from another's. Runs in a transaction and
-- rolls back, so it leaves the local database as it found it.
begin;
select plan(8);

-- Two users. The trigger gives each a profile.
insert into auth.users (id, aud, role, email) values
  ('7e570000-0000-0000-0000-0000000000a1', 'authenticated', 'authenticated', 'a@test.local'),
  ('7e570000-0000-0000-0000-0000000000b2', 'authenticated', 'authenticated', 'b@test.local');

insert into public.foods (id, name, source, kcal_100g, fat_100g, carbs_100g, protein_100g) values
  ('7e570000-0000-0000-0000-00000000f001', 'Spaghetti', 'community', 359, 2, 71, 12.5),
  ('7e570000-0000-0000-0000-00000000f002', 'Salz', 'community', 0, 0, 0, 0);

-- As A.
set local role authenticated;
set local request.jwt.claims = '{"sub": "7e570000-0000-0000-0000-0000000000a1", "role": "authenticated"}';

insert into public.recipes (id, user_id, name, total_g) values
  ('7e570000-0000-0000-0000-0000000000c1', '7e570000-0000-0000-0000-0000000000a1', 'Topf', 1600),
  ('7e570000-0000-0000-0000-0000000000c2', '7e570000-0000-0000-0000-0000000000a1', 'Shake', null);
insert into public.recipe_items (recipe_id, food_id, quantity_g) values
  ('7e570000-0000-0000-0000-0000000000c1', '7e570000-0000-0000-0000-00000000f001', 500),
  ('7e570000-0000-0000-0000-0000000000c1', '7e570000-0000-0000-0000-00000000f002', 0.4),
  ('7e570000-0000-0000-0000-0000000000c2', '7e570000-0000-0000-0000-00000000f001', 50);

select public.log_recipe('7e570000-0000-0000-0000-0000000000c1', '2026-10-04', 'dinner', 1, 200) as line \gset

select is(
  (select factor from public.logged_recipes where id = :'line'), 0.125::numeric,
  '200 g of a 1600 g pot is an eighth');
select is(
  (select quantity_g from public.food_logs where group_id = :'line' and food_id = '7e570000-0000-0000-0000-00000000f001'),
  62.5::numeric, 'each ingredient is scaled by that share');
select is(
  (select quantity_g from public.food_logs where group_id = :'line' and food_id = '7e570000-0000-0000-0000-00000000f002'),
  0.1::numeric, 'a share below 0.1 g is kept at 0.1 g, not dropped');
select throws_like(
  $$ select public.log_recipe('7e570000-0000-0000-0000-0000000000c2', '2026-10-04', 'snack', 1, 200) $$,
  '%no total weight%', 'grams need a made weight');

-- As B.
set local request.jwt.claims = '{"sub": "7e570000-0000-0000-0000-0000000000b2", "role": "authenticated"}';

select is((select count(*) from public.recipes)::int, 0, 'B sees none of A''s recipes');
select throws_like(
  $$ select public.log_recipe('7e570000-0000-0000-0000-0000000000c1', '2026-10-04', 'dinner', 1) $$,
  '%recipe not found%', 'B cannot log A''s recipe');
select throws_ok(
  format($$ insert into public.food_logs (user_id, date, meal_type, food_id, quantity_g, group_id)
            values ('7e570000-0000-0000-0000-0000000000b2', '2026-10-04', 'dinner',
                    '7e570000-0000-0000-0000-00000000f001', 100, %L) $$, :'line'),
  '23503', null, 'B cannot hang a row under A''s logged line');

-- As A again: deleting the line takes its rows.
set local request.jwt.claims = '{"sub": "7e570000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
delete from public.logged_recipes where id = :'line';
select is((select count(*) from public.food_logs where group_id = :'line')::int, 0, 'the rows go with the line');

select * from finish();
rollback;

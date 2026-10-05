-- `npm run db:test`: log_recipe and update_logged_recipe scale, refuse what they should, and
-- keeps one user's recipes away from another's. Runs in a transaction and
-- rolls back, so it leaves the local database as it found it.
begin;
select plan(15);

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

insert into public.recipes (id, user_id, name) values
  ('7e570000-0000-0000-0000-0000000000c1', '7e570000-0000-0000-0000-0000000000a1', 'Topf');
insert into public.recipe_items (recipe_id, food_id, quantity_g) values
  ('7e570000-0000-0000-0000-0000000000c1', '7e570000-0000-0000-0000-00000000f001', 500),
  ('7e570000-0000-0000-0000-0000000000c1', '7e570000-0000-0000-0000-00000000f002', 0.4);

select public.log_recipe('7e570000-0000-0000-0000-0000000000c1', '2026-10-04', 'dinner', 0.125) as line \gset

select is(
  (select quantity_g from public.food_logs where group_id = :'line' and food_id = '7e570000-0000-0000-0000-00000000f001'),
  62.5::numeric, 'an eighth of 500 g is 62.5 g');
select is(
  (select quantity_g from public.food_logs where group_id = :'line' and food_id = '7e570000-0000-0000-0000-00000000f002'),
  0.1::numeric, 'a share below 0.1 g is kept at 0.1 g, not dropped');

-- A quarter instead of an eighth, at lunch: every row doubles and moves.
select public.update_logged_recipe(:'line', 0.25, 'lunch');
select is(
  (select quantity_g from public.food_logs where group_id = :'line' and food_id = '7e570000-0000-0000-0000-00000000f001'),
  125::numeric, 'a new portion scales every row by the same ratio');
select is(
  (select count(*) from public.food_logs where group_id = :'line' and meal_type = 'lunch')::int, 2,
  'the rows move to the line''s new meal');
select is((select meal_type from public.logged_recipes where id = :'line'), 'lunch', 'and so does the line');

-- Parts as typed: 2 of 8 stays 2 of 8, and the share is theirs.
select public.update_logged_recipe(:'line', 99, 'lunch', 2::smallint, 8::smallint);
select is(
  (select array[parts_eaten, parts_total]::int[] from public.logged_recipes where id = :'line'), array[2, 8],
  '2 of 8 is kept as typed, not as 1/4');
select is((select factor from public.logged_recipes where id = :'line'), 0.25::numeric, 'the share comes from the parts');

-- There and back does not drift: a third, then the whole again.
select public.update_logged_recipe(:'line', 1.0 / 3, 'lunch');
select public.update_logged_recipe(:'line', 1, 'lunch');
select is(
  (select quantity_g from public.food_logs where group_id = :'line' and food_id = '7e570000-0000-0000-0000-00000000f001'),
  500::numeric, 'a third and back is 500 g again, not 499.9');
select is(
  (select quantity_g from public.food_logs where group_id = :'line' and food_id = '7e570000-0000-0000-0000-00000000f002'),
  0.4::numeric, 'a pinch held at 0.1 g by an eighth comes back as itself');

select throws_ok(
  format($$ insert into public.food_logs (user_id, date, meal_type, food_id, quantity_g, group_id)
            values ('7e570000-0000-0000-0000-0000000000a1', '2026-10-04', 'lunch',
                    '7e570000-0000-0000-0000-00000000f001', 10, %L) $$, :'line'),
  '23514', null, 'an ingredient row needs its base');

-- As B.
set local request.jwt.claims = '{"sub": "7e570000-0000-0000-0000-0000000000b2", "role": "authenticated"}';

select is((select count(*) from public.recipes)::int, 0, 'B sees none of A''s recipes');
select throws_like(
  $$ select public.log_recipe('7e570000-0000-0000-0000-0000000000c1', '2026-10-04', 'dinner', 1) $$,
  '%recipe not found%', 'B cannot log A''s recipe');
select throws_like(
  format($$ select public.update_logged_recipe(%L, 4, 'snack') $$, :'line'),
  '%not found%', 'B cannot change A''s logged line');
select throws_ok(
  format($$ insert into public.food_logs (user_id, date, meal_type, food_id, quantity_g, recipe_g, group_id)
            values ('7e570000-0000-0000-0000-0000000000b2', '2026-10-04', 'dinner',
                    '7e570000-0000-0000-0000-00000000f001', 100, 100, %L) $$, :'line'),
  '23503', null, 'B cannot hang a row under A''s logged line');

-- As A again: deleting the line takes its rows.
set local request.jwt.claims = '{"sub": "7e570000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
delete from public.logged_recipes where id = :'line';
select is((select count(*) from public.food_logs where group_id = :'line')::int, 0, 'the rows go with the line');

select * from finish();
rollback;

-- Local development only. `supabase start` and `supabase db reset` run this
-- against the local stack; `db push` never does, so it cannot reach production.
--
-- One user to sign in with, since signup is off: dev@merit.local / merit-dev,
-- with two months of plausible history (below).
-- The profile row comes from the on_auth_user_created trigger.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-00000000d3e5',
  'authenticated', 'authenticated', 'dev@merit.local',
  extensions.crypt('merit-dev', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(),
  '', '', '', ''
);

insert into auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) values (
  gen_random_uuid(),
  '00000000-0000-0000-0000-00000000d3e5',
  '00000000-0000-0000-0000-00000000d3e5',
  'email',
  '{"sub":"00000000-0000-0000-0000-00000000d3e5","email":"dev@merit.local","email_verified":true}',
  now(), now(), now()
);

-- ── Plausible history for the dev user ───────────────────────────────
-- Eight weeks of a person losing weight slowly and training four times a
-- week, counted back from today so it is always recent. Deterministic: the
-- "noise" is sin() of the day, so every reset produces the same screens.
-- Consent and onboarding are recorded, so a reset lands on the dashboard.

do $$
declare
  me constant uuid := '00000000-0000-0000-0000-00000000d3e5';
  -- The user's today, not the server's: UTC is still yesterday until 01:00.
  today constant date := (now() at time zone 'Europe/Berlin')::date;
  d int;
  day date;
  v int;
  w uuid;
  r record;
  e record;
  s int;
begin
  update public.profiles set
    display_name = 'Dev', locale = 'de', theme = 'system', height_cm = 181,
    birth_date = '1994-05-12', sex = 'male', activity_level = 'moderate', goal = 'lose',
    consent_at = now(), consent_version = '2026-09-10', onboarded_at = now()
  where user_id = me;

  insert into public.nutrition_goals (user_id, valid_from, mode, kcal, protein_g, fat_g, carbs_g)
  values (me, today - 60, 'manual', 1900, 150, 60, 200);

  -- Weigh-ins: about 85.5 kg two months ago to 81.3 today, a few days skipped.
  for d in 0..59 loop
    continue when d % 7 = 3 or d % 11 = 5;
    insert into public.weight_logs (user_id, date, weight_kg, body_fat_pct)
    values (me, today - d, round((81.3 + 0.07 * d + 0.35 * sin(d * 1.7))::numeric, 1),
            case when d % 7 = 0 then round((18.0 + 0.04 * d)::numeric, 1) end);
  end loop;

  -- Foods, per 100 g, the way a German shopper would have typed them in.
  insert into public.foods (id, name, brand, source, created_by, kcal_100g, fat_100g, saturated_fat_100g,
                            carbs_100g, sugars_100g, fibre_100g, protein_100g, salt_100g) values
    ('f0000000-0000-0000-0000-000000000001', 'Skyr natur', 'Milbona', 'community', me, 63, 0.2, 0.1, 4, 4, null, 11, 0.1),
    ('f0000000-0000-0000-0000-000000000002', 'Haferflocken zart', 'K-Classic', 'community', me, 372, 7, 1.3, 59, 0.7, 10, 13.5, 0.01),
    ('f0000000-0000-0000-0000-000000000003', 'Heidelbeeren', null, 'community', me, 57, 0.3, null, 14.5, 10, 2.4, 0.7, null),
    ('f0000000-0000-0000-0000-000000000004', 'Banane', null, 'community', me, 89, 0.3, 0.1, 23, 12, 2.6, 1.1, null),
    ('f0000000-0000-0000-0000-000000000005', 'Mandeldrink ungesüßt', 'Alpro', 'community', me, 13, 1.1, 0.1, 0, 0, 0.4, 0.4, 0.13),
    ('f0000000-0000-0000-0000-000000000006', 'Whey Protein Vanille', 'ESN', 'community', me, 380, 6, 3.5, 8, 5, null, 75, 0.5),
    ('f0000000-0000-0000-0000-000000000007', 'Vollkornbrot', null, 'community', me, 215, 1.6, 0.3, 38, 3, 7, 7.5, 1.1),
    ('f0000000-0000-0000-0000-000000000008', 'Hähnchenbrust roh', null, 'community', me, 110, 1.5, 0.4, 0, 0, null, 23.5, 0.15),
    ('f0000000-0000-0000-0000-000000000009', 'Basmatireis roh', null, 'community', me, 350, 0.9, 0.2, 77, 0.2, 1.3, 8, null),
    ('f0000000-0000-0000-0000-000000000010', 'Spaghetti roh', 'Barilla', 'community', me, 359, 2, 0.5, 71, 3.5, 3, 12.5, 0.01),
    ('f0000000-0000-0000-0000-000000000011', 'Tomatensauce', null, 'community', me, 45, 1.5, 0.2, 6, 5, 1.5, 1.5, 0.9),
    ('f0000000-0000-0000-0000-000000000012', 'Brokkoli', null, 'community', me, 34, 0.4, null, 7, 1.7, 2.6, 2.8, null),
    ('f0000000-0000-0000-0000-000000000013', 'Eier', null, 'community', me, 143, 9.5, 3.1, 0.7, 0.4, null, 12.6, 0.36),
    ('f0000000-0000-0000-0000-000000000014', 'Olivenöl', null, 'community', me, 884, 100, 14, 0, 0, null, 0, null),
    ('f0000000-0000-0000-0000-000000000015', 'Apfel', null, 'community', me, 52, 0.2, null, 14, 10, 2.4, 0.3, null),
    ('f0000000-0000-0000-0000-000000000016', 'Magerquark', 'Milsani', 'community', me, 67, 0.2, 0.1, 4, 4, null, 12, 0.1),
    ('f0000000-0000-0000-0000-000000000017', 'Erdnussbutter', null, 'community', me, 600, 50, 8, 12, 5, 7, 25, 0.02),
    ('f0000000-0000-0000-0000-000000000018', 'Lachsfilet', null, 'community', me, 208, 13, 3, 0, 0, null, 20, 0.15);

  -- Four weeks of eating, three rotating days, two days not logged at all,
  -- and today only as far as lunch.
  create temp table plan (variant int, meal text, food int, grams numeric) on commit drop;
  insert into plan values
    (0, 'breakfast', 1, 250), (0, 'breakfast', 2, 50), (0, 'breakfast', 3, 100),
    (0, 'lunch', 8, 200), (0, 'lunch', 9, 90), (0, 'lunch', 12, 200), (0, 'lunch', 14, 10),
    (0, 'dinner', 7, 100), (0, 'dinner', 16, 250), (0, 'dinner', 15, 150),
    (0, 'snack', 4, 120), (0, 'snack', 17, 20),
    (1, 'breakfast', 5, 300), (1, 'breakfast', 6, 30), (1, 'breakfast', 4, 120), (1, 'breakfast', 2, 60),
    (1, 'lunch', 10, 110), (1, 'lunch', 11, 150), (1, 'lunch', 8, 150),
    (1, 'dinner', 13, 180), (1, 'dinner', 7, 80), (1, 'dinner', 12, 150),
    (1, 'snack', 15, 160),
    (2, 'breakfast', 7, 120), (2, 'breakfast', 13, 120),
    (2, 'lunch', 18, 150), (2, 'lunch', 9, 80), (2, 'lunch', 12, 150), (2, 'lunch', 14, 8),
    (2, 'dinner', 1, 250), (2, 'dinner', 2, 40), (2, 'dinner', 3, 80),
    (2, 'snack', 6, 30), (2, 'snack', 4, 120);

  for d in 0..27 loop
    continue when d in (6, 13, 22);
    v := d % 3;
    insert into public.food_logs (user_id, date, meal_type, food_id, quantity_g)
    select me, today - d, meal,
           ('f0000000-0000-0000-0000-0000000000' || lpad(food::text, 2, '0'))::uuid,
           round(grams * (1 + 0.1 * sin(d + food)))
    from plan
    where plan.variant = v and (d > 0 or meal in ('breakfast', 'lunch'));
  end loop;

  -- Two recipes: a shake counted in servings, a bowl the same.
  insert into public.recipes (id, user_id, name) values
    ('c0000000-0000-0000-0000-000000000001', me, 'Proteinshake'),
    ('c0000000-0000-0000-0000-000000000002', me, 'Skyr-Bowl');
  insert into public.recipe_items (recipe_id, food_id, quantity_g) values
    ('c0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000005', 300),
    ('c0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000006', 30),
    ('c0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', 250),
    ('c0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000003', 100),
    ('c0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000002', 40);

  -- Two routines on a weekly plan: upper Monday and Thursday, lower Tuesday
  -- and Friday.
  insert into public.routines (id, user_id, name, position, created_at) values
    ('a0000000-0000-0000-0000-000000000001', me, 'Oberkörper', 0, today - 60),
    ('a0000000-0000-0000-0000-000000000002', me, 'Unterkörper', 1, today - 60);
  insert into public.routine_days (routine_id, weekday) values
    ('a0000000-0000-0000-0000-000000000001', 1), ('a0000000-0000-0000-0000-000000000001', 4),
    ('a0000000-0000-0000-0000-000000000002', 2), ('a0000000-0000-0000-0000-000000000002', 5);

  create temp table lifts (routine int, pos int, name text, base numeric, reps int) on commit drop;
  insert into lifts values
    (1, 0, 'Bankdrücken', 70, 8), (1, 1, 'Rudern am Kabel', 60, 10), (1, 2, 'Schulterdrücken', 40, 8),
    (1, 3, 'Latzug', 60, 10), (1, 4, 'Barbell Curl', 30, 10), (1, 5, 'Trizepsdrücken am Kabel', 25, 12),
    (2, 0, 'Kniebeuge mit Langhantel', 90, 6), (2, 1, 'Rumänisches Kreuzheben', 80, 8),
    (2, 2, 'Beinpresse', 150, 10);

  insert into public.routine_exercises (routine_id, exercise_id, position, set_reps)
  select ('a0000000-0000-0000-0000-00000000000' || l.routine)::uuid, x.id, l.pos, array[l.reps, l.reps, l.reps]
  from lifts l
  join lateral (select id from public.exercises where name_de = l.name or name_en = l.name limit 1) x on true;

  -- Eight weeks of those sessions, never today (a session today would show
  -- as running), one missed, two and a half kilos added every fortnight.
  for d in 1..56 loop
    day := today - d;
    continue when d = 33;
    for r in select case extract(isodow from day)::int when 1 then 1 when 4 then 1 when 2 then 2 when 5 then 2 end as routine loop
      continue when r.routine is null;
      insert into public.workouts (user_id, date, routine_id, ended_at)
      values (me, day, ('a0000000-0000-0000-0000-00000000000' || r.routine)::uuid, day + time '19:15')
      returning id into w;
      for e in select l.*, x.id as exercise_id from lifts l
               join lateral (select id from public.exercises where name_de = l.name or name_en = l.name limit 1) x on true
               where l.routine = r.routine loop
        for s in 1..3 loop
          insert into public.workout_sets (workout_id, user_id, exercise_id, set_number, reps, weight_kg, rir, done)
          values (w, me, e.exercise_id, s, e.reps - (s = 3)::int, e.base + 2.5 * floor((56 - d) / 14), 3 - s, true);
        end loop;
      end loop;
    end loop;
  end loop;
end $$;

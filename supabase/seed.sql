-- Local development only. `supabase start` and `supabase db reset` run this
-- against the local stack; `db push` never does, so it cannot reach production.
--
-- One user to sign in with, since signup is off: dev@merit.local / merit-dev.
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

-- ─────────────────────────────────────────────────────────────────────
-- Recording consent, because the data here is Article 9 data.
--
-- Body weight, what somebody eats and how they train are `Gesundheitsdaten`
-- under Art. 9(1) GDPR. Processing them is prohibited unless an exception in
-- Art. 9(2) applies, and for a private, non-commercial app with no medical or
-- employment context the only workable one is (a): the data subject's explicit
-- consent for a specified purpose.
--
-- Explicit means a deliberate act, informed, and separable from anything else —
-- so it is its own screen, not a checkbox beside a password field, and it names
-- the categories rather than pointing at a document.
--
-- Three columns because Art. 7(1) requires the controller to be *able to
-- demonstrate* consent, which needs three facts: that it was given, when, and
-- to which version of the text. A policy that changes materially needs asking
-- again, and without the version there is no way to know who has seen what.
--
-- Withdrawal is deletion: Art. 7(3) makes consent withdrawable at any time and
-- as easily as it was given, and for this app withdrawing it removes the only
-- lawful basis for every row the account has. So the account screen offers the
-- deletion, not a toggle that would leave the data sitting there unprocessable.
-- ─────────────────────────────────────────────────────────────────────

alter table public.profiles
  add column consent_at      timestamptz,
  add column consent_version text;

comment on column public.profiles.consent_at is
  'When explicit Art. 9(2)(a) consent was given. Null means the account may not be used yet.';
comment on column public.profiles.consent_version is
  'Which version of the privacy notice was consented to, so a material change can ask again.';

-- Existing accounts predate the notice and have to be asked like anybody else;
-- the columns start null and the app gates on them.

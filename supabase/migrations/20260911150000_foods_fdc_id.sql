-- ─────────────────────────────────────────────────────────────────────
-- Which FoodData Central record a cached whole food came from.
--
-- The catalogue already refuses to hold the same barcode twice, which is what
-- keeps a packaged product from being fetched from Open Food Facts more than
-- once. Whole foods have no barcode, so a banana picked out of a USDA search by
-- two people would have become two bananas, and the same lookup would have gone
-- out to api.data.gov again on the next search (CLAUDE.md: cache every resolved
-- product so the same lookup never hits an external API twice).
--
-- Unique and nullable: only rows that came from USDA carry one.
-- ─────────────────────────────────────────────────────────────────────

alter table public.foods
  add column fdc_id integer unique check (fdc_id > 0);

comment on column public.foods.fdc_id is
  'FoodData Central id, for rows cached from a USDA search. Null for everything else.';

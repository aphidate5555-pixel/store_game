-- supabase/seed.e2e.sql
-- Seed data for the E2E database only. Never applied to production, and
-- deliberately separate from 99_seed_demo.sql: the e2e set is built around
-- the assertions in tests/e2e, so adding a demo product must not be able to
-- break a test.
--
-- Every product code is prefixed E2E- so a stray run against a shared
-- database is obvious and easy to clean up.
--
-- Idempotent: on conflict do nothing throughout.

-- ---------------------------------------------------------------------------
-- Games
-- ---------------------------------------------------------------------------
insert into public.games (slug, name, description, is_enabled, position)
values
  ('e2e-game-alpha', 'E2E GAME ALPHA', 'หมวดหมู่สำหรับทดสอบอัตโนมัติ', true, 1),
  ('e2e-game-beta', 'E2E GAME BETA', 'หมวดหมู้ทดสอบที่ไม่เอื้อถึงในหน้าเว็บไซต์', true, 2),
  -- Disabled on purpose: the "hidden category" assertions need one, and its
  -- products must be absent from the public listing.
  ('e2e-game-hidden', 'E2E GAME HIDDEN', 'หมวดหมู้ที่ปิดใช้งาน', false, 3)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Products
--
-- Mixed currencies on purpose: currency is a mandatory facet, and a single
-- currency in the data would hide the behaviour the switch test asserts.
--
-- Mixed statuses too: the sold-product indexing rule (C-9) needs a real
-- sold row, not a mocked one.
-- ---------------------------------------------------------------------------
with seeded as (
  select
    'E2E-1001'::text   as code, 'ไอดีเกมทดสอบ ระดับเทพ'::text   as name,
    'e2e-game-alpha'::text as slug, 1250::bigint as price,
    'THB'::public.product_currency as cur, 'available'::public.product_status as st,
    true as visible
  union all select 'E2E-1002', 'ไอดีเกมทดสอบ ระดับเทพ', 'e2e-game-alpha', 2500, 'THB', 'sold', true
  union all select 'E2E-1003', 'ไอดีเกมทดสอบ ราคาถูก', 'e2e-game-alpha', 180, 'THB', 'available', true
  union all select 'E2E-2001', 'ไอดีเกมทดสอบ หมวดที่สอง', 'e2e-game-beta', 890, 'THB', 'available', true
  union all select 'E2E-2002', 'ไอดีเกมทดสอบ หมวดที่สอง ขายแล้ว', 'e2e-game-beta', 1250, 'THB', 'sold', true
  -- Lao kip, so the currency switch has real data behind it. The NAME stays
  -- Thai: the storefront is Thai-only and a Lao product name would fail the
  -- "no Lao characters" assertion.
  union all select 'E2E-3001', 'ไอดีเกมทดสอบ ราคาเป็นเงินสกุลที่สอง', 'e2e-game-alpha', 250000, 'LAK', 'available', true
  -- Hidden product: is_visible = false is the ONLY thing that means noindex.
  -- A sold product must stay indexable (C-9), which is why this row is
  -- separate rather than reusing E2E-1002.
  union all select 'E2E-1004', 'ไอดีเกมทดสอบ ยังไม่เผยแพร่', 'e2e-game-alpha', 9999, 'THB', 'available', false
)
insert into public.products (
  product_code, name, game_id, price_amount, currency,
  rank, hero_count, skin_count, status, is_visible
)
select
  s.code, s.name, g.id, s.price, s.cur,
  'Legend', 10, 3, s.st, s.visible
from seeded s
join public.games g on g.slug = s.slug
on conflict (product_code) do nothing;

-- A product inside a disabled game. Both conditions have to be checked for
-- it to leave the listing (F-09), so it is what proves the policy is not
-- checking is_visible alone.
insert into public.products (
  product_code, name, game_id, price_amount, currency, status, is_visible
)
select
  'E2E-4001', 'ไอดีเกมทดสอบ ในหมวดที่ปิดใช้งาน', g.id,
  500, 'THB', 'available', true
from public.games g
where g.slug = 'e2e-game-hidden'
on conflict (product_code) do nothing;

-- ---------------------------------------------------------------------------
-- Featured picks
-- ---------------------------------------------------------------------------
update public.products
set featured_at = now()
where product_code in ('E2E-1001', 'E2E-2001', 'E2E-3001')
  and featured_at is null;

-- ---------------------------------------------------------------------------
-- Store settings
--
-- Only what the assertions need. In particular whatsapp_number is left
-- NULL: the order button has to render a disabled state with an explanation
-- rather than a link to a real chat, and a test that finds one would be
-- trying to contact whoever owns the number.
-- ---------------------------------------------------------------------------
update public.store_settings
set
  store_name        = 'ร้านทดสอบอัตโนมัติ',
  store_description = 'ข้อมูลตัวอย่างสำหรับชุดทดสอบอัตโนมัติ',
  primary_color     = '#E11D2E',
  accent_color      = '#F59E0B',
  business_hours    = 'ทุกวัน 09:00-23:00 น.',
  maintenance_mode  = false
where id = true;

-- ---------------------------------------------------------------------------
-- Sections: enabled, with no text overrides, so the storefront falls back to
-- the Thai defaults in src/lib/i18n/th/defaults.ts.
-- ---------------------------------------------------------------------------
insert into public.site_sections (section_key, payload)
values
  ('hero',              '{"enabled": true}'::jsonb),
  ('trust',             '{"enabled": true}'::jsonb),
  ('categories',        '{"enabled": true}'::jsonb),
  ('featured_products', '{"enabled": true}'::jsonb),
  ('all_products',      '{"enabled": true}'::jsonb),
  ('navigation',        '{"enabled": true}'::jsonb),
  ('footer',            '{"enabled": true}'::jsonb)
on conflict (section_key) do nothing;

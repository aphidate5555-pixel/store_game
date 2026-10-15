-- 99_seed_demo.sql
-- Development data only. Never run this against production: it creates
-- visible products that nobody has paid for.
--
-- Four games and a spread of products across both currencies, so that /,
-- /products, /games/[slug] and all three concept routes have something to
-- render on the first run.
--
-- Idempotent: on conflict do nothing throughout.

-- ===========================================================================
-- Games
-- ===========================================================================
insert into public.games (slug, name, description, is_enabled, position)
values
  ('mobile-legends', 'MOBILE LEGENDS: BANG BANG',
   'เกม MOBA ยอดนิยม มีฮีโร่และสกินให้เลือกมากมาย', true, 1),
  ('free-fire', 'FREE FIRE',
   'เกมยิงมุมมองบุคคลที่เล่นได้แม้บนมือถือรุ่นกลาง ๆ', true, 2),
  ('rov', 'ROV: King of Glory',
   'เกม MOBA ของคนไทย เล่นคู่หรือห้าคนพร้อมกัน', true, 3),
  ('pubg-mobile', 'PUBG MOBILE',
   'เกมยิงแนว survival เล่นได้ทั้งมือถือและพีซี', true, 4),
  ('point-blank', 'POINT BLANK',
   'เกมยิงมุมมองบุคคลคลาสสิกของเกมไทย', false, 5)
on conflict (slug) do nothing;

-- ===========================================================================
-- Products
--
-- Both currencies are represented on purpose: the storefront treats currency
-- as a mandatory facet, and a seed with a single currency would hide the
-- behaviour that the CurrencySwitch test depends on.
-- ===========================================================================
with seeded as (
  select
    'ML-20481'::text   as code, 'ไอดีเกม ML-20481 ฮีโร่ระดับเทพ'::text as name,
    'mobile-legends'::text as slug, 1250::bigint as price, 'THB'::public.product_currency as cur,
    'Mythic'::text as rank, 42 as heroes, 8 as skins, 'available'::public.product_status as st
  union all select 'ML-30512', 'ไอดีเกม ML-30512 ชุดสกินพิเศษ', 'mobile-legends', 890, 'THB', 'Legend', 60, 15, 'available'
  union all select 'ML-41002', 'ไอดีเกม ML-41002 แพ็กครบฮีโร่', 'mobile-legends', 4500, 'THB', 'Epic', 120, 40, 'sold'
  union all select 'ML-51877', 'ไอดีเกม ML-51877 ราคาประหยัด', 'mobile-legends', 250, 'THB', null, 12, 2, 'available'
  union all select 'FF-10023', 'ไอดีเกม FF-10023 ระดับเพชร', 'free-fire', 750, 'THB', 'Heroic', 35, 6, 'available'
  union all select 'FF-20045', 'ไอดีเกม FF-20045 ชุดกำลังพล', 'free-fire', 320, 'THB', 'Epic', 20, 3, 'available'
  union all select 'FF-30099', 'ไอดีเกม FF-30099 เต็มอุปกรณ์', 'free-fire', 1980, 'THB', 'Heroic', 55, 18, 'available'
  union all select 'ROV-1001', 'ไอดีเกม ROV-1001 ฮีโร่ครบ', 'rov', 600, 'THB', 'Legend', 48, 11, 'available'
  union all select 'ROV-2050', 'ไอดีเกม ROV-2050 สกินหายาก', 'rov', 1500, 'THB', 'Mythic', 30, 25, 'available'
  union all select 'ROV-3110', 'ไอดีเกม ROV-3110 ชุดเริ่มต้น', 'rov', 180, 'THB', null, 8, 1, 'available'
  union all select 'PB-1001', 'ไอดีเกม PB-1001 ระดับทอง', 'pubg-mobile', 2200, 'THB', 'Epic', 40, 9, 'available'
  union all select 'PB-2020', 'ไอดีเกม PB-2020 เสื้อผ้าพิเศษ', 'pubg-mobile', 980, 'THB', 'Legend', 25, 14, 'available'
  union all select 'PB-3030', 'ไอดีเกม PB-3030 ปืนพิเศษ', 'pubg-mobile', 3400, 'THB', 'Mythic', 33, 22, 'sold'
  -- Lao kip, so the currency facet has real data behind it. The names stay
  -- Thai: the storefront is Thai-only (acceptance check 11) and a Lao
  -- product name would fail the "no Lao characters anywhere" e2e assertion.
  union all select 'LA-90001', 'ไอดีเกม LA-90001 ระดับเทพ', 'mobile-legends', 250000, 'LAK', 'Legend', 15, 4, 'available'
  union all select 'LA-90002', 'ไอดีเกม LA-90002 ชุดพิเศษ', 'free-fire', 180000, 'LAK', 'Epic', 22, 7, 'available'
)
insert into public.products (
  product_code, name, game_id, price_amount, currency, rank,
  hero_count, skin_count, status, is_visible
)
select
  s.code, s.name, g.id, s.price, s.cur, s.rank,
  s.heroes, s.skins, s.st, true
from seeded s
join public.games g on g.slug = s.slug
on conflict (product_code) do nothing;

-- ===========================================================================
-- A hidden product, so the "is_visible = false means noindex" path is real
-- rather than theoretical.
-- ===========================================================================
insert into public.products (
  product_code, name, game_id, price_amount, currency, status, is_visible
)
select
  'ML-HIDDEN1', 'ไอดีเกม ML-HIDDEN1 (ยังไม่เผยแพร่)', g.id,
  9999, 'THB', 'available', false
from public.games g
where g.slug = 'mobile-legends'
on conflict (product_code) do nothing;

-- ===========================================================================
-- Storefront configuration
-- ===========================================================================
update public.store_settings
set
  store_name        = 'ร้านไอดีพร้อมเล่น',
  store_description = 'ร้านไอดีเกมออนไลน์ คัดลอกรหัสสินค้าแล้วทักมาทาง WhatsApp ส่งมอบไว',
  primary_color     = '#E11D2E',
  accent_color      = '#F59E0B',
  business_hours    = 'ทุกวัน 09:00-23:00 น.',
  seo_title         = 'ร้านไอดีพร้อมเล่น — ไอดีเกม MOBILE LEGENDS, FREE FIRE, ROV, PUBG',
  seo_description   = 'ค้นหาและกรองไอดีเกมตามหมวดหมู่ สถานะ สกุลเงิน และช่วงราคา สั่งซื้อผ่าน WhatsApp ส่งมอบไว',
  footer_text       = 'ขอบคุณที่ใช้บริการ',
  footer_disclaimer = 'เว็บไซต์นี้เป็นตัวแทนนำเสนอสินค้าเท่านั้น ไม่ใช่เว็บไซต์ทางการของผู้พัฒนาเกม การสั่งซื้อและการชำระเงินดำเนินการผ่าน WhatsApp โดยตรงกับร้าน'
where id = true;

-- whatsapp_number is intentionally left null in the seed. Setting a real
-- number here would point the demo storefront at somebody's chat.
--
-- ===========================================================================
-- Section payloads
--
-- Only `enabled` is seeded, on purpose: the Thai copy lives in
-- src/lib/i18n/th/defaults.ts and an empty payload means "not edited yet",
-- so a change to the default text is visible on every install without a
-- migration.
-- ===========================================================================
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

-- Featured picks: the most recent available products.
update public.products
set featured_at = now()
where product_code in ('ML-20481', 'FF-10023', 'ROV-2050', 'PB-2020')
  and featured_at is null;

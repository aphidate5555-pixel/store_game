-- FIX_rpc_definitive.sql
-- รันใน SQL Editor ตามลำดับข้างล่าง
--
-- ===========================================================================
-- สถานะที่วินิจฉัยได้แล้ว
--
--   get_site_shell             200 OK
--   is_admin                   401 permission denied for schema private
--   game_catalog_cards         401 เหมือนกัน
--   search_products            401 เหมือนกัน
--   get_product_detail         401 เหมือนกัน
--   admin_dashboard_stats_gate 401 เหมือนกัน
--
--   GET /rest/v1/games         200 OK (ตาราง public อ่านได้ปกติ)
--
-- สรุป: ฟังก์ชัน 5 ตัวถูกประกาศไว้ใน schema private แทน public
-- มีเพียง get_site_shell ตัวเดียวที่ถูกตำแหน่ง
-- ไฟล์ 12_functions.sql ในโปรเจกต์ประกาศถูกทั้งหมดแล้ว
--
-- ===========================================================================
-- ขั้นที่ 1: ลบฟังก์ชันที่อยู่ผิด schema
--
-- create or replace จะไม่ย้ายฟังก์ชันข้าม schema ดังนั้นต้องลบทิ้งก่อน
-- ปลอดภัยเพราะตอนนี้ยังไม่มีข้อมูลจริงที่พึ่งฟังก์ชันเหล่านี้อยู่
-- ===========================================================================
drop function if exists private.is_admin();
drop function if exists private.is_admin_internal(uuid);
drop function if exists private.search_products(text, text, public.product_status, public.product_currency, bigint, bigint, text, int, int);
drop function if exists private.get_product_detail(text);
drop function if exists private.get_site_shell();
drop function if exists private.game_catalog_cards();
drop function if exists private.admin_dashboard_stats_gate();
drop function if exists private.grant_admin(uuid);
drop function if exists private.grant_admin_internal(uuid);
drop function if exists private.revoke_admin(uuid);
drop function if exists private.revoke_admin_internal(uuid);
drop function if exists private.write_audit(text, text, text, jsonb);
drop function if exists private.write_audit_internal(text, text, text, jsonb);
drop function if exists private.append_product_images(uuid, jsonb);
drop function if exists private.append_product_images_internal(uuid, jsonb);
drop function if exists private.set_product_cover(uuid, uuid);
drop function if exists private.set_product_cover_internal(uuid, uuid);

-- helper ที่โค้ด TypeScript เรียกใช้โดยตรง
drop function if exists private.is_safe_link(text);
drop function if exists private.is_safe_social(text);
drop function if exists private.is_media_path(text);

-- trigger function
drop function if exists private.set_updated_at();
drop function if exists private.products_search_text();
drop function if exists private.games_refresh_search_text();
drop function if exists private.products_featured_at();
drop function if exists private.deny_delete();
drop function if exists private.handle_new_user();
drop function if exists private.guard_media_key();

-- introspection (F-07: ต้องอยู่ใน private และไม่มี wrapper ใน public)
drop function if exists private.schema_tables();
drop function if exists private.schema_columns(text);
drop function if exists private.tables_missing_rls();
drop function if exists private.executable_functions_for(text);

-- ===========================================================================
-- ขั้นที่ 2: ลบตัวใน public ที่อาจมี signature เก่าค้างอยู่
-- ===========================================================================
drop function if exists public.is_admin();
drop function if exists public.is_admin_internal(uuid);
drop function if exists public.search_products(text, text, public.product_status, public.product_currency, bigint, bigint, text, int, int);
drop function if exists public.get_product_detail(text);
drop function if exists public.game_catalog_cards();
drop function if exists public.admin_dashboard_stats_gate();
drop function if exists public.grant_admin(uuid);
drop function if exists public.revoke_admin(uuid);
drop function if exists public.write_audit(text, text, text, jsonb);
drop function if exists public.append_product_images(uuid, jsonb);
drop function if exists public.set_product_cover(uuid, uuid);

-- get_site_shell ทำงานได้แล้ว แต่ลบเพื่อให้สร้างใหม่ด้วย search_path ที่ถูกต้อง
drop function if exists public.get_site_shell();

-- helper ที่อาจถูกประกาศผิด schema ใน public
drop function if exists public.is_safe_link(text);
drop function if exists public.is_safe_social(text);
drop function if exists public.is_media_path(text);
drop function if exists public.is_media_path_for_bucket(text, text);

-- ===========================================================================
-- ขั้นที่ 3: >>> ตอนนี้ paste ไฟล์ 01_extensions_and_helpers.sql ทั้งไฟล์แล้ว Run <<<
--
--           จากนั้น paste ไฟล์ 12_functions.sql ทั้งไฟล์แล้ว Run
--
--           ไฟล์ 12_functions.sql ประกาศ:
--             private.*  security definer  (ตัวจริง ไม่มี grant ให้ใคร)
--             public.*   security invoker   (wrapper ที่ Data API เรียกได้)
--
-- ===========================================================================
-- ขั้นที่ 4: >>> ตอนนี้ paste ไฟล์ 14_grants.sql ทั้งไฟล์แล้ว Run <<<
--
--           จำเป็นมาก เพราะ grant ผูกกับ OID ของฟังก์ชัน
--           ฟังก์ชันที่เพิ่งลบแล้วสร้างใหม่ได้ OID ใหม่ grant เก่าจะใช้ไม่ได้
--
-- ===========================================================================
-- ขั้นที่ 5: รัน 16_views_and_guards.sql อีกครั้ง (revoke ต้องเป็นขั้นสุดท้าย)
-- ===========================================================================

-- ===========================================================================
-- ขั้นที่ 6: เช็คว่า triggers ยังผูกกับฟังก์ชันที่ยังมีอยู่
--     ถ้าขึ้นว่า trigger อ้างถึงฟังก์ชันที่ไม่มีแล้ว ให้รัน 11_triggers.sql ซ้ำ
-- ===========================================================================
select
  t.tgname as trigger_name,
  c.relname as table_name,
  p.proname as function_name,
  n.nspname as function_schema
from pg_trigger t
join pg_class c on c.oid = t.tgfoid is null or true
join pg_proc p on p.oid = t.tgfoid
join pg_namespace n on n.oid = p.pronamespace
where not t.tgisinternal
order by c.relname, t.tgname;

-- ===========================================================================
-- ขั้นที่ 7: ตรวจผลสุดท้าย
--     คาดหวัง: ทั้ง 6 อยู่ใน public และ search_path = public
-- ===========================================================================
select
  n.nspname as schema_name,
  p.proname as function_name,
  p.prosecdef as security_definer,
  array_to_string(p.proconfig, ', ') as config,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.proname in (
  'is_admin','is_safe_link','is_safe_social','is_media_path',
  'search_products','get_product_detail','get_site_shell',
  'game_catalog_cards','admin_dashboard_stats_gate'
)
order by p.proname;

-- ===========================================================================
-- ขั้นที่ 8: ยืนยันว่า private ยังปิดสนิทตามสัญญา (F-07)
-- ===========================================================================
select
  has_schema_privilege('anon', 'private', 'USAGE')           as anon_private,
  has_schema_privilege('authenticated', 'private', 'USAGE')  as auth_private;

-- คาดหวังทั้งสองเป็น false
--
-- ถ้าเป็น true แปลว่ามีบางอย่าง grant USAGE ให้ private
-- ให้รัน: revoke all on schema private from anon, authenticated, public;

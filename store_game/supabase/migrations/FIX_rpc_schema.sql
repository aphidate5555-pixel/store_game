-- FIX_rpc_schema.sql
-- รันหลังจาก 14_grants.sql ใน Supabase SQL Editor
--
-- สาเหตุ: ทุกฟังก์ชัน R denied foPC ตอบ 401 ด้วยข้อความ
--   "permissionr schema private"
-- แต่ตาราง public อ่านได้ปกติ ดังนั้นปัญหาอยู่ที่ฟังก์ชัน ไม่ใช่ grant บน schema
--
-- สาเหตุที่เป็นไปได้: ไฟล์ 12_functions.sql ที่ apply ไปเป็นเวอร์ชันก่อนหน้า
-- ซึ่งประกาศฟังก์ชันไว้ใน schema private ทั้งหมด (รวมที่ควรอยู่ใน public)
-- หรือมีการ revoke USAGE บน schema public จาก role ใด role หนึ่ง

-- ---------------------------------------------------------------------------
-- ขั้นที่ 1: ตรวจสถานะจริงก่อน
-- ---------------------------------------------------------------------------
select
  n.nspname                                as schema_name,
  p.proname                                as function_name,
  p.prosecdef                              as security_definer,
  p.proconfig                             as config,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.proname in ('is_admin', 'search_products', 'get_site_shell', 'game_catalog_cards')
order by n.nspname, p.proname;

-- คาดหวัง: ทุกฟังก์ชันอยู่ใน schema public
-- ถ้าเห็น private แทน แปลว่าเป็นปัญหาข้อ 1

-- ---------------------------------------------------------------------------
-- ขั้นที่ 2: ตรวจสิทธิ์บน schema
-- ---------------------------------------------------------------------------
select has_schema_privilege('anon', 'public', 'USAGE')   as anon_usage_public,
       has_schema_privilege('anon', 'private', 'USAGE')  as anon_usage_private,
       has_schema_privilege('authenticated', 'public', 'USAGE') as auth_usage_public;

-- คาดหวัง: anon_usage_public = true, anon_usage_private = false
-- ถ้า anon_usage_public = false ให้รัน grant ด้านล่าง

-- ---------------------------------------------------------------------------
-- ขั้นที่ 3: แก้
-- ---------------------------------------------------------------------------

-- 3.1 คืนสิทธิ์ USAGE บน schema public
grant usage on schema public to anon, authenticated;

-- 3.2 F-07: private ต้องไม่มีสิทธิ์ใด ๆ สำหรับ anon/authenticated
--      (ถ้าบรรทัดนี้ไม่มีผล แปลว่าไม่เคยถูก revoke)
revoke all on schema private from anon, authenticated;
revoke all on schema private from public;

-- 3.3 ย้ายฟังก์ชันที่หลุดไปอยู่ใน private กลับมาเป็น public
--     ต้องรันหลัง 12_functions.sql เสมอ เพราะถ้า private เป็นเจ้าของชื่อฟังก์ชัน
--     create or replace บน public จะไม่ error แต่จะสร้างฟังก์ชันใหม่แยก

-- public wrapper ที่ต้องมี (จาก 12_functions.sql)
-- is_admin, search_products, get_product_detail, get_site_shell,
-- game_catalog_cards, admin_dashboard_stats_gate, grant_admin,
-- revoke_admin, write_audit, append_product_images, set_product_cover

-- ---------------------------------------------------------------------------
-- ขั้นที่ 4: ตรวจผล
-- ---------------------------------------------------------------------------
select 'functions in public' as item, count(*)::text as value
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('is_admin','search_products','get_site_shell','game_catalog_cards')
union all
select 'functions in private', count(*)::text
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'private'
  and p.proname in ('is_admin','search_products','get_site_shell','game_catalog_cards')
union all
select 'anon can read games', (case
  when has_table_privilege('anon', 'public.games', 'SELECT') then 'yes' else 'no' end);

-- คาดหวัง:
--   functions in public  = 4
--   functions in private = 0
--   anon can read games  = yes

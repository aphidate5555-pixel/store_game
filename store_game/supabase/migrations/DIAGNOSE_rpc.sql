-- DIAGNOSE_rpc.sql
-- รันทีเดียวเพื่อดูว่าฟังก์ชันแต่ละตัวอยู่ที่ไหนจริง
--
-- ผลที่วินิจฉัยได้แล้วจากการยิงตรง:
--   get_site_shell  -> 200
--   อีก 5 ตัว       -> 401 "permission denied for schema private"
--   GET games       -> 200 (ตาราง public ปกติ)
--
-- คำสั่งนี้บอกว่า OID ของฟังก์ชันอยู่ schema ไหน เพื่อยืนยันว่าเป็นการ "หลุด schema"
-- จริง ไม่ใช่ปัญหา grant

-- ---------------------------------------------------------------------------
-- 1. ตำแหน่งจริงของทุกฟังก์ชันที่โค้ดเรียก
-- ---------------------------------------------------------------------------
select
  p.proname as function_name,
  n.nspname as schema_name,
  p.prosecdef as security_definer,
  coalesce(array_to_string(p.proconfig, ' | '), '(ไม่ได้ตั้ง)') as config,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.proname in (
  'is_admin','is_safe_link','is_safe_social','is_media_path',
  'search_products','get_product_detail','get_site_shell',
  'game_catalog_cards','admin_dashboard_stats_gate',
  'grant_admin','revoke_admin','write_audit',
  'append_product_images','set_product_cover'
)
order by p.proname, n.nspname;

-- คาดหวัง: ทุกชื่อมีแค่บรรทัดเดียว และ schema_name = public

-- ---------------------------------------------------------------------------
-- 2. schema privilege
-- ---------------------------------------------------------------------------
select
  has_schema_privilege('anon', 'public', 'USAGE')           as anon_public,
  has_schema_privilege('anon', 'private', 'USAGE')          as anon_private,
  has_schema_privilege('authenticated', 'public', 'USAGE')  as auth_public,
  has_schema_privilege('authenticated', 'private', 'USAGE') as auth_private;

-- ---------------------------------------------------------------------------
-- 3. search_path ของ role ที่ PostgREST ใช้เชื่อมต่อ
--    ถ้า role มี private อยู่ข้างหน้า search_path
--    ฟังก์ชันที่ "ไม่ได้ตั้ง search_path" จะ resolve ไปที่ private
--    ซึ่งให้ผลเป็น 401 แบบเดียวกันทั้งที่ประกาศไว้ใน public
-- ---------------------------------------------------------------------------
select rolname, coalesce(array_to_string(rolconfig, ' | '), '(ไม่ได้ตั้ง)') as config
from pg_roles
where rolname in ('anon', 'authenticated', 'authenticator', 'service_role', 'supabase_admin');

-- ---------------------------------------------------------------------------
-- 4. grant EXECUTE ที่มีจริง
-- ---------------------------------------------------------------------------
select
  p.proname as function_name,
  n.nspname as schema_name,
  has_function_privilege('anon', p.oid, 'EXECUTE')           as anon,
  has_function_privilege('authenticated', p.oid, 'EXECUTE')  as authenticated
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'private')
  and p.proname in (
    'is_admin','search_products','get_product_detail',
    'get_site_shell','game_catalog_cards','admin_dashboard_stats_gate'
  )
order by p.proname, n.nspname;

-- ---------------------------------------------------------------------------
-- 5. trigger ยังผูกกับฟังก์ชันที่มีอยู่จริงไหม
--    ถ้าฟังก์ชันถูกลบไปแล้ว trigger จะค้างและ error ตอน insert/update
-- ---------------------------------------------------------------------------
select
  c.relname as table_name,
  t.tgname as trigger_name,
  p.proname as function_name,
  n.nspname as function_schema
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_proc p on p.oid = t.tgfoid
join pg_namespace n on n.oid = p.pronamespace
where not t.tgisinternal
order by c.relname, t.tgname;

-- ---------------------------------------------------------------------------
-- 6. ตรวจว่าตารางมีข้อมูลแล้วหรือยัง (ใช้วินิจฉัยว่าต้อง seed ไหม)
-- ---------------------------------------------------------------------------
select
  (select count(*) from public.games)    as games,
  (select count(*) from public.products) as products,
  (select count(*) from public.admins)   as admins;

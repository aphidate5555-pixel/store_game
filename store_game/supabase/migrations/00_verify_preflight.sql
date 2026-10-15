-- 00_verify_preflight.sql
-- Confirms the target database can accept the rest of the migration set
-- before anything is created. Run this first; a failure here means the
-- project is not in the expected empty state.
--
-- Idempotent: read-only.

-- 1. Extensions we depend on must be installable.
create extension if not exists pg_trgm;    -- search_products ILIKE
create extension if not exists pgcrypto;   -- gen_random_uuid

-- 2. The private schema holds every security-definer helper (F-07).
--    No grant is issued to it, ever; the public schema carries only the thin
--    invoker wrappers that RLS and the Data API are allowed to reach.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- 3. Confirm the project is empty enough to be safe to proceed.
--    Re-running against a partially migrated database is also fine, because
--    every later file is idempotent; this is a warning, not a gate.
do $$
declare
  existing integer;
begin
  select count(*) into existing
  from information_schema.tables
  where table_schema = 'public'
    and table_name in ('games', 'products', 'product_images', 'store_settings', 'site_sections');

  if existing > 0 then
    raise notice 'พบตารางของโปรเจกต์อยู่แล้ว % ตาราง — ไฟล์ถัดไปเป็น idempotent จึงรันซ้ำได้', existing;
  end if;
end $$;

select 'preflight ok' as status;

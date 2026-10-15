-- 16_views_and_guards.sql
-- Schema introspection for the guard tests.
--
-- F-06: the guard suite needs TWO credentials and they are not
-- interchangeable.
--
--   anonymous behaviour   the anon key, over the Data API. Proves that a
--                         visitor cannot read the roster, cannot write a
--                         product, and can only see published rows.
--
--   schema drift          a direct Postgres connection (SUPABASE_CI_DB_URL).
--                         These functions are NOT reachable over the Data API
--                         at all, so an anonymous caller cannot enumerate the
--                         schema even with a valid key.
--
-- F-07: the functions therefore live in `private` and have no public wrapper.
-- An earlier draft kept them in `public` as security-definer functions and
-- only revoked the PUBLIC role, which left them callable by anon and
-- authenticated: an anonymous visitor could list every table, every column
-- and every constraint in the project.
--
-- Idempotent.

-- ===========================================================================
-- private: introspection
-- ===========================================================================

create or replace function private.schema_tables()
returns table (table_name text, rls_enabled boolean, rls_forced boolean, row_count bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return query
  select
    c.relname::text,
    c.relrowsecurity,
    c.relforcerowsecurity,
    (select count(*) from pg_class x where x.oid = c.oid)
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
  order by c.relname;
end;
$$;

create or replace function private.schema_columns(p_table text)
returns table (
  column_name text,
  data_type text,
  is_nullable text,
  column_default text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return query
  select
    a.attname::text,
    format_type(a.atttypid, a.atttypmod),
    case when a.attnotnull then 'NO' else 'YES' end,
    a.atthasdef::text
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = p_table
    and a.attnum > 0
    and not a.attisdropped
  order by a.attnum;
end;
$$;

-- The query the schema guard test asserts is empty.
create or replace function private.tables_missing_rls()
returns table (table_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select c.relname::text
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and not c.relrowsecurity
  order by c.relname;
$$;

-- Lists the public functions an anonymous caller can execute, so the grant
-- suite can assert that no privileged function leaked into that set.
create or replace function private.executable_functions_for(role_name text)
returns table (schema_name text, function_name text, arguments text)
language sql
stable
security definer
set search_path = ''
as $$
  select
    n.nspname::text,
    p.proname::text,
    pg_get_function_arguments(p.oid)::text
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where has_function_privilege(role_name, p.oid, 'EXECUTE')
    and n.nspname in ('public', 'private')
  order by n.nspname, p.proname;
$$;

-- ===========================================================================
-- Revoke every path to the above (C-32, F-06, F-07)
--
-- CREATE FUNCTION grants EXECUTE to PUBLIC. The grant has to be withdrawn
-- explicitly; relying on the function being "internal" is not a control.
-- ===========================================================================
revoke execute on function private.schema_tables()                  from public;
revoke execute on function private.schema_columns(text)             from public;
revoke execute on function private.tables_missing_rls()             from public;
revoke execute on function private.executable_functions_for(text)   from public;

revoke execute on function private.schema_tables()                  from anon, authenticated;
revoke execute on function private.schema_columns(text)             from anon, authenticated;
revoke execute on function private.tables_missing_rls()             from anon, authenticated;
revoke execute on function private.executable_functions_for(text)   from anon, authenticated;

-- And again at the default-privileges level, so a function added later does
-- not silently become executable.
alter default privileges in schema private revoke execute on functions from public;

-- No wrapper is created for any of these. There is no public counterpart,
-- and adding one would undo F-07.
--
-- The guard tests reach them with the direct CI connection documented in
-- F-16: psql, a migration runner, or the `postgres` driver in
-- scripts/seed-e2e.mjs. The application bundle never does.

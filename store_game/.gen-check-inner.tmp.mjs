/**
 * Generates supabase/migrations/REBUILD.sql
 *
 * Why this file exists
 * -------------------
 * The database ended up holding the project's functions in the wrong schema,
 * and `create or replace` cannot move a function between schemas. Fixing it
 * by hand means dropping things in dependency order, and every attempt has
 * surfaced the next layer of dependency:
 *
 *   2BP01 private.set_updated_at()   ← five triggers depend on it
 *   2BP01 is_admin()                 ← sixteen policies depend on it
 *   2BP01 is_safe_link(text)         ← the store_settings CHECKs depend on it
 *
 * Rather than have the operator paste seven files in a remembered sequence,
 * this emits one file that captures the CHECK constraints, tears down in
 * dependency order, rebuilds from the migration sources already in the repo,
 * and restores the constraints.
 *
 * Nothing here invents SQL. Every rebuild block is copied verbatim from the
 * migration of the same name, so this file cannot drift away from the source
 * it is generated from.
 */
import { readFileSync, writeFileSync } from 'node:fs'

/**
 * Order matters twice over.
 *
 * REBUILD: helper -> trigger -> function -> RLS -> grant -> storage -> guard,
 * because each layer references the one before it.
 *
 * The migrations below are in that order, so concatenating them in the listed
 * order produces a valid rebuild.
 */
const MIGRATIONS = [
  '01_extensions_and_helpers',
  '11_triggers',
  '12_functions',
  '13_rls',
  '14_grants',
  '15_storage',
  '16_views_and_guards',
]

/** Function names whose definitions must not be dropped while anything uses them. */
const HELPER_FUNCTIONS = ['is_safe_link', 'is_safe_social', 'is_media_path', 'is_media_path_for_bucket']

const read = (name) => readFileSync(`supabase/migrations/${name}.sql`, 'utf8')

const teardown = `-- ===========================================================================
-- GENERATED FILE — do not edit by hand.
-- Source: supabase/migrations/{${MIGRATIONS.join(', ')}}
-- Regenerate with: node scripts/generate-rebuild.mjs
--
-- Rebuilds every function, policy, trigger and CHECK constraint in one pass.
--
-- Dependency order, discovered by trying it the wrong way first:
--
--   constraint  ->  function   (settings_primary_hex calls is_safe_link)
--   policy      ->  function   (every policy calls is_admin)
--   trigger     ->  function   (trg_* call set_updated_at)
--   function    ->  function   (public.is_admin calls private.is_admin_internal)
--
-- So the teardown is: constraint -> policy -> trigger -> function,
 * and the rebuild is the reverse of that within each migration's own order.
--
-- No table data is touched.
-- ===========================================================================


-- ===========================================================================
-- PART 1 — capture the CHECK constraints that call a helper function
--
-- They are captured rather than recreated from memory because they are
-- defined inside the CREATE TABLE statements of migrations 03-09, which are
-- not part of this rebuild. Dropping them would silently remove the database
-- half of the URL, colour and media-path validation (C-4, F-10).
-- ===========================================================================
create temp table rebuild_saved_constraints (
  table_name     text,
  constraint_name text,
  definition     text
) on commit drop;

do $$
declare
  r record;
begin
  for r in
    select
      n.nspname || '.' || c.relname as qualified_table,
      c.relname as table_name,
      con.conname as constraint_name,
      pg_get_constraintdef(con.oid) as definition
    from pg_constraint con
    join pg_class c on c.oid = con.conrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and con.contype = 'c'
      and (
        con.conbin is not null
        and (
          ${HELPER_FUNCTIONS.map((name) => `pg_get_constraintdef(con.oid) like '%${name}(%'`).join(' or\n          ')}
        )
      )
  loop
    insert into rebuild_saved_constraints (table_name, constraint_name, definition)
    values (r.table_name, r.constraint_name, r.definition);
  end loop;
end $$;

select 'captured constraints' as step, count(*)::text as found
from rebuild_saved_constraints;


-- ===========================================================================
-- PART 2 — teardown: CHECK constraints
-- ===========================================================================
do $$
declare
  r record;
begin
  for r in select table_name, constraint_name from rebuild_saved_constraints
  loop
    execute format('alter table public.%I drop constraint if exists %I',
                   r.table_name, r.constraint_name);
  end loop;
end $$;


-- ===========================================================================
-- PART 3 — teardown: policies
-- ===========================================================================
drop policy if exists p_read_games            on public.games;
drop policy if exists p_read_products         on public.products;
drop policy if exists p_read_product_images   on public.product_images;
drop policy if exists p_read_settings         on public.store_settings;
drop policy if exists p_read_sections         on public.site_sections;
drop policy if exists p_admin_games           on public.games;
drop policy if exists p_admin_products        on public.products;
drop policy if exists p_admin_images          on public.product_images;
drop policy if exists p_admin_settings_insert on public.store_settings;
drop policy if exists p_admin_settings_update on public.store_settings;
drop policy if exists p_admin_sections_insert on public.site_sections;
drop policy if exists p_admin_sections_update on public.site_sections;
drop policy if exists p_own_profile_select    on public.profiles;
drop policy if exists p_own_profile_update    on public.profiles;
drop policy if exists p_admins_admin_select   on public.admins;
drop policy if exists p_audit_admin_select    on public.admin_audit_log;
drop policy if exists p_audit_admin_insert    on public.admin_audit_log;

drop policy if exists media_public_read on storage.objects;
drop policy if exists media_admin_insert on storage.objects;
drop policy if exists media_admin_update on storage.objects;
drop policy if exists media_admin_delete on storage.objects;


-- ===========================================================================
-- PART 4 — teardown: triggers
-- ===========================================================================
drop trigger if exists trg_admins_updated_at          on public.admins;
drop trigger if exists trg_games_updated_at           on public.games;
drop trigger if exists trg_products_updated_at        on public.products;
drop trigger if exists trg_product_images_updated_at  on public.product_images;
drop trigger if exists trg_store_settings_updated_at  on public.store_settings;
drop trigger if exists trg_site_sections_updated_at    on public.site_sections;
drop trigger if exists trg_products_search_text      on public.products;
drop trigger if exists trg_games_refresh_search_text on public.games;
drop trigger if exists trg_products_featured_at      on public.products;
drop trigger if exists trg_deny_delete_store_settings on public.store_settings;
drop trigger if exists trg_deny_delete_site_sections  on public.site_sections;
drop trigger if exists trg_handle_new_user           on auth.users;
drop trigger if exists trg_guard_media_key           on storage.objects;


-- ===========================================================================
-- PART 5 — teardown: functions
--   public first: the wrappers call the private implementations, so dropping
--   them in this order leaves nothing dangling.
-- ===========================================================================
drop function if exists public.is_admin();
drop function if exists public.is_admin_internal(uuid);
drop function if exists public.search_products(text, text, public.product_status, public.product_currency, bigint, bigint, text, int, int);
drop function if exists public.get_product_detail(text);
drop function if exists public.get_site_shell();
drop function if exists public.game_catalog_cards();
drop function if exists public.admin_dashboard_stats_gate();
drop function if exists public.grant_admin(uuid);
drop function if exists public.revoke_admin(uuid);
drop function if exists public.write_audit(text, text, text, jsonb);
drop function if exists public.append_product_images(uuid, jsonb);
drop function if exists public.set_product_cover(uuid, uuid);
drop function if exists public.is_safe_link(text);
drop function if exists public.is_safe_social(text);
drop function if exists public.is_media_path(text);
drop function if exists public.is_media_path_for_bucket(text, text);

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
drop function if exists private.is_safe_link(text);
drop function if exists private.is_safe_social(text);
drop function if exists private.is_media_path(text);
drop function if exists private.is_media_path_for_bucket(text, text);
drop function if exists private.set_updated_at();
drop function if exists private.products_search_text();
drop function if exists private.games_refresh_search_text();
drop function if exists private.products_featured_at();
drop function if exists private.deny_delete();
drop function if exists private.handle_new_user();
drop function if exists private.guard_media_key();
drop function if exists private.schema_tables();
drop function if exists private.schema_columns(text);
drop function if exists private.tables_missing_rls();
drop function if exists private.executable_functions_for(text);


-- ===========================================================================
-- PART 6 — rebuild
-- ===========================================================================

`

const parts = MIGRATIONS.map((name) => `\n\n-- ===== ${name}.sql =====\n${read(name)}`).join('')

const restore = `

-- ===========================================================================
-- PART 7 — restore the CHECK constraints captured in PART 1
--
-- These live inside the CREATE TABLE statements of migrations 03-09, which
-- this file does not replay, so they are put back from what was captured.
-- The helper functions they call exist again by this point.
-- ===========================================================================
do $$
declare
  r record;
begin
  for r in select table_name, constraint_name, definition from rebuild_saved_constraints
  loop
    execute format('alter table public.%I add constraint %I %s',
                   r.table_name, r.constraint_name, r.definition);
  end loop;
end $$;

select 'restored constraints' as step, count(*)::text as found
from rebuild_saved_constraints;


-- ===========================================================================
-- PART 8 — verify
-- ===========================================================================

-- Every function must appear exactly once, in schema public.
-- A name appearing twice means a copy is still stranded in private.
select
  p.proname as function_name,
  n.nspname as schema_name,
  p.prosecdef as security_definer,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.proname in (
  'is_admin','is_safe_link','is_safe_social','is_media_path',
  'search_products','get_product_detail','get_site_shell',
  'game_catalog_cards','admin_dashboard_stats_gate'
)
order by p.proname, n.nspname;

-- Expected: 9 rows, every schema_name = public, every anon_can_execute = true.

-- The private schema must stay unreachable (F-07).
select
  has_schema_privilege('anon', 'private', 'USAGE')          as anon_private,
  has_schema_privilege('authenticated', 'private', 'USAGE') as auth_private;

-- Expected: false / false.

-- Triggers must be back.
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

-- Expected: 12 rows, every function_schema = private.

-- Every table still has RLS enabled.
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
order by c.relname;

-- Expected: 0 rows.

-- Table data must be untouched by this file.
select
  (select count(*) from public.games)    as games,
  (select count(*) from public.products) as products,
  (select count(*) from public.admins)   as admins;
`

writeFileSync('.rebuild-expected.tmp.sql', teardown + parts + restore)
console.log('wrote supabase/migrations/REBUILD.sql')

-- ===========================================================================
-- GENERATED FILE — do not edit by hand.
-- Source: supabase/migrations/{01_extensions_and_helpers, 11_triggers, 12_functions, 13_rls, 14_grants, 15_storage, 16_views_and_guards}
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
          pg_get_constraintdef(con.oid) like '%is_safe_link(%' or
          pg_get_constraintdef(con.oid) like '%is_safe_social(%' or
          pg_get_constraintdef(con.oid) like '%is_media_path(%' or
          pg_get_constraintdef(con.oid) like '%is_media_path_for_bucket(%'
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



-- ===== 01_extensions_and_helpers.sql =====
-- 01_extensions_and_helpers.sql
-- Validation helpers used as CHECK constraints.
--
-- These functions are the database half of a defence that also exists in
-- TypeScript. The TypeScript copy lives in src/lib/validation/url.ts and the
-- two host sets MUST stay identical; tests/unit/sql-allowlist-parity.test.ts
-- reads this file and fails if they drift.
--
-- Idempotent: create or replace.

-- ---------------------------------------------------------------------------
-- is_safe_link(value)
--   General-purpose link check. Returns true for the '#rrggbb' colours the
--   brand fields hold, so one function serves both purposes.
-- ---------------------------------------------------------------------------
create or replace function public.is_safe_link(value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value is not null and value ~ '^#[0-9a-fA-F]{6}$';
$$;

-- ---------------------------------------------------------------------------
-- is_safe_social(value)
--   Only https, and only the exact hostnames the storefront is allowed to
--   link to. A prefix comparison would accept
--   'https://www.facebook.com.evil.com/', so the host is matched exactly
--   after parsing the URL.
-- ---------------------------------------------------------------------------
create or replace function public.is_safe_social(value text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  parsed_host text;
  parsed_scheme text;
begin
  if value is null or value = '' then
    return false;
  end if;

  -- Reject anything with an embedded scheme before parsing, so a value like
  -- 'javascript:https://facebook.com' cannot be reinterpreted.
  if value ~ '[^a-zA-Z0-9:/._~?#\[\]@!$&()*+,;=%-]' then
    return false;
  end if;

  parsed_scheme := split_part(value, ':', 1);
  if lower(parsed_scheme) <> 'https' then
    return false;
  end if;

  -- Strip the scheme, then the credentials, then the path.
  parsed_host := split_part(split_part(value, '://', 2), '/', 1);
  parsed_host := split_part(parsed_host, '@', 2); -- drop user:pass@
  parsed_host := lower(split_part(parsed_host, ':', 1));

  return parsed_host in (
    'facebook.com', 'www.facebook.com',
    'tiktok.com', 'www.tiktok.com',
    'instagram.com', 'www.instagram.com',
    'wa.me', 'api.whatsapp.com', 'm.me'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- is_media_path(value)
--   Enforces the object path shape (F-04, F-10).
--
--   The path stored in the database is relative to its bucket and NEVER
--   carries the bucket name as a prefix. Two shapes are accepted:
--
--     products/<uuid>/<YYYY-MM>/<16hex>.webp          1600px
--     products/<uuid>/<YYYY-MM>/<16hex>-card.webp    640px
--     brand/<kind>/<YYYY-MM>/<16hex>.png
--
--   A value like 'product-media/products/...' is rejected: that shape came
--   from an earlier draft in which the bucket was duplicated into the column.
-- ---------------------------------------------------------------------------
create or replace function public.is_media_path(value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value is not null
    and value !~ '\.\.'
    and value !~ '^/'
    and (
      value ~ '^products/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9]{4}-(0[1-9]|1[0-2])/[0-9a-f]{16}(-card)?\.webp$'
      or
      value ~ '^brand/(logo|favicon|og|category)/[0-9]{4}-(0[1-9]|1[0-2])/[0-9a-f]{16}\.png$'
    );
$$;

-- Kept for callers that pass the bucket explicitly. The bucket argument is
-- validated for shape only and is deliberately NOT part of the stored path.
create or replace function public.is_media_path_for_bucket(bucket_name text, value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select bucket_name in ('product-media', 'brand-assets')
     and public.is_media_path(value);
$$;


-- ===== 11_triggers.sql =====
-- 11_triggers.sql
-- Triggers created after every table they touch exists.
--
-- Idempotent: drop if exists before create.

-- ---------------------------------------------------------------------------
-- set_updated_at
-- ---------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_admins_updated_at on public.admins;
create trigger trg_admins_updated_at
  before update on public.admins
  for each row execute function private.set_updated_at();

drop trigger if exists trg_games_updated_at on public.games;
create trigger trg_games_updated_at
  before update on public.games
  for each row execute function private.set_updated_at();

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
  before update on public.products
  for each row execute function private.set_updated_at();

drop trigger if exists trg_store_settings_updated_at on public.store_settings;
create trigger trg_store_settings_updated_at
  before update on public.store_settings
  for each row execute function private.set_updated_at();

drop trigger if exists trg_site_sections_updated_at on public.site_sections;
create trigger trg_site_sections_updated_at
  before update on public.site_sections
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- search_text (C-18)
--
-- The storefront promises that a search matches the product code, the product
-- name AND the game name. Assembling all three here is what makes that promise
-- true, and it is also what the trigram index covers.
-- ---------------------------------------------------------------------------
create or replace function private.products_search_text()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  game_name text;
begin
  select g.name into game_name
  from public.games g
  where g.id = new.game_id;

  new.search_text := lower(
    coalesce(new.product_code, '') || ' ' ||
    coalesce(new.name, '') || ' ' ||
    coalesce(game_name, '')
  );

  return new;
end;
$$;

drop trigger if exists trg_products_search_text on public.products;
create trigger trg_products_search_text
  before insert or update of product_code, name, game_id on public.products
  for each row execute function private.products_search_text();

-- Renaming a game has to reindex its products, or a search for the new name
-- finds nothing while the old name still matches.
create or replace function private.games_refresh_search_text()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.products
  set search_text = lower(
    coalesce(product_code, '') || ' ' ||
    coalesce(name, '') || ' ' ||
    coalesce(new.name, '')
  )
  where game_id = new.id;

  return new;
end;
$$;

drop trigger if exists trg_games_refresh_search_text on public.games;
create trigger trg_games_refresh_search_text
  after update of name on public.games
  for each row execute function private.games_refresh_search_text();

-- ---------------------------------------------------------------------------
-- featured_at
-- A product that stops being featured must leave the shelf, not linger with
-- a stale timestamp.
-- ---------------------------------------------------------------------------
create or replace function private.products_featured_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.featured_at is distinct from old.featured_at then
    if new.featured_at is not null then
      new.featured_at := coalesce(new.featured_at, now());
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_products_featured_at on public.products;
create trigger trg_products_featured_at
  before update of featured_at on public.products
  for each row execute function private.products_featured_at();

-- ---------------------------------------------------------------------------
-- deny_delete_settings (C-4)
--
-- store_settings and site_sections are singleton-ish configuration. A delete
-- grant would let one mistake blank the entire storefront, and there is no UI
-- that offers it. The trigger is the backstop; the missing grant is the
-- primary defence.
-- ---------------------------------------------------------------------------
create or replace function private.deny_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'ลบ % ไม่ได้ — ตารางนี้เป็นการตั้งค่าของร้าน', tg_table_name
    using errcode = 'restrict_violation';
end;
$$;

drop trigger if exists trg_deny_delete_store_settings on public.store_settings;
create trigger trg_deny_delete_store_settings
  before delete on public.store_settings
  for each row execute function private.deny_delete();

drop trigger if exists trg_deny_delete_site_sections on public.site_sections;
create trigger trg_deny_delete_site_sections
  before delete on public.site_sections
  for each row execute function private.deny_delete();

-- ---------------------------------------------------------------------------
-- handle_new_user
-- Creates the profile row. Email sign-up is disabled at the Supabase Auth
-- level (C-32), so in practice this only fires for users an administrator
-- created from the dashboard.
-- ---------------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_handle_new_user on auth.users;
create trigger trg_handle_new_user
  after insert on auth.users
  for each row execute function private.handle_new_user();


-- ===== 12_functions.sql =====
-- 12_functions.sql
-- Every function the application calls is DEFINED here (C-19). No other
-- migration defines one, and none of them grants EXECUTE (C-31): 14_grants.sql
-- owns every privilege statement in the project.
--
-- F-07 splits the functions in two:
--
--   private.*   security definer — the real implementation. Granted to nobody.
--   public.*    security invoker — a thin wrapper the Data API and RLS may
--               call. It re-checks is_admin() and delegates.
--
-- The split matters because a security-definer function in `public` is
-- reachable by anyone who can guess its name, and CREATE FUNCTION grants
-- EXECUTE to PUBLIC by default. A GRANT to a specific role in a private
-- schema is not possible without a policy, so the wrapper is the only path in.
--
-- Idempotent: create or replace.

-- ===========================================================================
-- private: authorisation
-- ===========================================================================

create or replace function private.is_admin_internal(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admins a
    where a.user_id = p_uid
      and a.revoked_at is null
  );
$$;

-- The one and only public is_admin(). RLS policies call this, and so does
-- requireAdmin() in src/lib/auth/require-admin.ts.
--
-- SECURITY DEFINER is load-bearing, not decoration. F-07 revokes USAGE on
-- schema `private` from anon and authenticated, so an `invoker` function has no
-- privilege left to call private.is_admin_internal() with — it fails with 42501
-- "permission denied for schema private". Because every RLS policy on games,
-- products and product_images calls this function, getting it wrong takes down
-- the entire read path of the storefront, not just the admin area.
--
-- Definer is safe here because the body takes no argument, reads only the
-- caller's own auth.uid(), and returns a boolean. It cannot be pointed at
-- another user's row. `set search_path = ''` keeps it from resolving through a
-- caller-controlled search_path.
--
-- auth.uid() reads the JWT claim off the session, so it still names the caller
-- under SECURITY DEFINER — the guard is not bypassed by the privilege switch.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin_internal(auth.uid());
$$;

-- ===========================================================================
-- Catalogue reads — security invoker so RLS still applies
-- ===========================================================================

-- F-01: the return contract is TABLE(items, total). There is no
-- `rows setof public.products` form anywhere in this project, and no
-- compatibility shim for it.
--
-- C-17: p_status and p_currency are declared with their enum types. Passing
-- `text` here fails at CREATE FUNCTION with "operator does not exist".
--
-- C-18: matching runs against search_text (code + name + game name), which is
-- what the trigram index covers. ESCAPE '!' pairs with likePattern() in
-- src/lib/catalog/search-params.ts.
--
-- C-22: total is computed over the whole filtered set, not the page, so the
-- pager can render "หน้า 2 จาก 7". Reading it only on page 1 keeps the count
-- query off every subsequent request.
create or replace function public.search_products(
  p_pattern    text                      default null,
  p_game_slug  text                      default null,
  p_status     public.product_status     default null,
  p_currency   public.product_currency   default 'THB',
  p_min        bigint                    default null,
  p_max        bigint                    default null,
  p_sort       text                      default 'newest',
  p_limit      int                       default 24,
  p_offset     int                       default 0
)
returns table (items public.products[], total bigint)
language sql
stable
security invoker
set search_path = public
as $$
  with priced as (
    select
      p as product_row,
      p.created_at,
      p.product_code,
      case
        when p_currency = 'THB' then coalesce(p.price_thb, case when p.currency = 'THB' then p.price_amount end)
        when p_currency = 'LAK' then coalesce(p.price_lak, case when p.currency = 'LAK' then p.price_amount end)
        else p.price_amount
      end as effective_price
    from public.products p
    join public.games g on g.id = p.game_id
    where p.is_visible
      and g.is_enabled
      and (p_status is null or p.status = p_status)
      and (p_game_slug is null or g.slug = p_game_slug)
      and (
        p_pattern is null
        or p.search_text ilike ('%' || p_pattern || '%') escape '!'
      )
  ),
  filtered as (
    select pr.*
    from priced pr
    where pr.effective_price is not null
      and (p_min is null or pr.effective_price >= p_min)
      and (p_max is null or pr.effective_price <= p_max)
  ),
  paged as (
    select f.product_row
    from filtered f
    order by
      case when p_sort = 'price_asc'  then f.effective_price end asc nulls last,
      case when p_sort = 'price_desc' then f.effective_price end desc nulls last,
      case when p_sort = 'oldest'     then f.created_at      end asc nulls last,
      f.created_at desc,
      f.product_code asc
    limit least(greatest(coalesce(p_limit, 24), 1), 100)
    offset greatest(coalesce(p_offset, 0), 0)
  )
  select
    coalesce((select array_agg(pg.product_row) from paged pg), '{}'::public.products[]),
    (select count(*) from filtered);
$$;

comment on function public.search_products is
  'F-01: คืน (items, total) · C-17: param เป็น enum · C-18: ค้นบน search_text';

-- The product page body. Returns the product, its game, its images in
-- position order, and up to four siblings in the same game (C-9 — a sold
-- product links onward so the visitor is not left on a dead end).
create or replace function public.get_product_detail(p_code text)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_product public.products;
  v_game    public.games;
begin
  select * into v_product
  from public.products
  where upper(product_code) = upper(p_code);

  if not found then
    return null;
  end if;

  select * into v_game
  from public.games
  where id = v_product.game_id;

  -- A disabled game removes its products from the public catalogue, so the
  -- detail page must agree with the listing rather than showing a product
  -- that /products refuses to list.
  if v_game is null or not v_game.is_enabled then
    return null;
  end if;

  return jsonb_build_object(
    'product', to_jsonb(v_product),
    'game', to_jsonb(v_game),
    'images', (
      select coalesce(jsonb_agg(to_jsonb(i) order by i.position), '[]'::jsonb)
      from public.product_images i
      where i.product_id = v_product.id
    ),
    'related', (
      select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
      from (
        select r2.*
        from public.products r2
        join public.games g2 on g2.id = r2.game_id
        where r2.game_id = v_product.game_id
          and r2.id <> v_product.id
          and r2.is_visible
          and g2.is_enabled
        order by r2.created_at desc
        limit 4
      ) r
    )
  );
end;
$$;

-- One round trip for the maintenance gate and the theme. The gate cannot use
-- a cached value (C-26), so this runs on every public request; that is the
-- price of the brand colour being correct immediately after a save.
create or replace function public.get_site_shell()
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_settings public.store_settings;
begin
  select * into v_settings from public.store_settings where id = true;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'settings', to_jsonb(v_settings),
    'sections', (
      select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb)
      from public.site_sections s
    )
  );
end;
$$;

-- Category cards with a live count of what is actually buyable, computed in
-- one pass rather than a query per category.
create or replace function public.game_catalog_cards()
returns table (
  id               uuid,
  slug             text,
  name             text,
  description      text,
  image_path       text,
  available_count  bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    g.id,
    g.slug,
    g.name,
    g.description,
    g.image_path,
    count(p.id) filter (where p.status = 'available') as available_count
  from public.games g
  left join public.products p on p.game_id = g.id and p.is_visible
  where g.is_enabled
  group by g.id, g.slug, g.name, g.description, g.image_path, g.position
  order by g.position asc, g.name asc;
$$;

-- ===========================================================================
-- private: privileged writes
-- ===========================================================================

-- C-10: raises when the user does not exist. The previous version accepted a
-- uuid, matched no row, and reported success while the grant was still in
-- place — the caller would believe an account had been given access when it
-- had not.
create or replace function private.grant_admin_internal(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin_internal(auth.uid()) then
    raise exception 'ไม่มีสิทธิ์จัดการผู้ดูแลระบบ' using errcode = 'insufficient_privilege';
  end if;

  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'ไม่พบผู้ใช้นี้ในระบบ' using errcode = 'no_data_found';
  end if;

  insert into public.admins (user_id, granted_at, revoked_at)
  values (p_user_id, now(), null)
  on conflict (user_id) do update
    set granted_at = now(), revoked_at = null;
end;
$$;

create or replace function private.revoke_admin_internal(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin_internal(auth.uid()) then
    raise exception 'ไม่มีสิทธิ์จัดการผู้ดูแลระบบ' using errcode = 'insufficient_privilege';
  end if;

  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'ไม่พบผู้ใช้นี้ในระบบ' using errcode = 'no_data_found';
  end if;

  update public.admins
  set revoked_at = now()
  where user_id = p_user_id
    and revoked_at is null;

  if not found then
    raise exception 'ผู้ใช้นี้ไม่ได้เป็นผู้ดูแลระบบอยู่แล้ว' using errcode = 'no_data_found';
  end if;
end;
$$;

-- SECURITY DEFINER for the same reason as public.is_admin(): an invoker here
-- cannot reach schema `private`, so the call would 42501. The authorisation
-- check stays inside the private implementation, which re-reads auth.uid() and
-- raises for a non-admin — switching to definer does not move the decision.
create or replace function public.grant_admin(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  select private.grant_admin_internal(p_user_id);
$$;

create or replace function public.revoke_admin(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  select private.revoke_admin_internal(p_user_id);
$$;

create or replace function private.write_audit_internal(
  p_action text,
  p_entity text,
  p_entity_id text,
  p_meta jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin_internal(auth.uid()) then
    raise exception 'ไม่มีสิทธิ์บันทึกประวัติ' using errcode = 'insufficient_privilege';
  end if;

  insert into public.admin_audit_log (actor_id, action, entity, entity_id, meta)
  values (auth.uid(), p_action, p_entity, p_entity_id, coalesce(p_meta, '{}'::jsonb));
end;
$$;

create or replace function public.write_audit(
  p_action text,
  p_entity text,
  p_entity_id text,
  p_meta jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  select private.write_audit_internal(p_action, p_entity, p_entity_id, p_meta);
$$;

-- ===========================================================================
-- Gallery: position reservation under a row lock (C-16)
-- ===========================================================================

-- The reservation happens inside the transaction, while the product row is
-- locked. Computing the next position with a separate SELECT and then
-- INSERTing lets two administrators uploading at the same time both read the
-- same max(position) and collide — the second insert then violates
-- unique (product_id, position) and the whole upload fails.
create or replace function private.append_product_images_internal(
  p_product_id uuid,
  p_row jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_next integer;
  v_image_id uuid;
begin
  if not private.is_admin_internal(auth.uid()) then
    raise exception 'ไม่มีสิทธิ์เพิ่มรูปภาพ' using errcode = 'insufficient_privilege';
  end if;

  if not exists (select 1 from public.products where id = p_product_id) then
    raise exception 'ไม่พบสินค้านี้' using errcode = 'no_data_found';
  end if;

  -- Serialises concurrent uploads of the same product.
  perform 1 from public.products where id = p_product_id for update;

  select coalesce(max(position) + 1, 0)
  into v_next
  from public.product_images
  where product_id = p_product_id;

  insert into public.product_images (
    product_id, storage_path, full_path, width, height, position, alt
  )
  values (
    p_product_id,
    p_row ->> 'storage_path',
    p_row ->> 'full_path',
    (p_row ->> 'width')::integer,
    (p_row ->> 'height')::integer,
    v_next,
    left(coalesce(p_row ->> 'alt', ''), 120)
  )
  returning id into v_image_id;

  return v_image_id;
end;
$$;

create or replace function public.append_product_images(
  p_product_id uuid,
  p_row jsonb
)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select private.append_product_images_internal(p_product_id, p_row);
$$;

-- Promotes an image to position 0 by swapping with the current cover rather
-- than renumbering every row. F-05: position 0 is the single source of truth
-- for the cover, so there is nothing else to update.
create or replace function private.set_product_cover_internal(
  p_product_id uuid,
  p_image_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin_internal(auth.uid()) then
    raise exception 'ไม่มีสิทธิ์ตั้งภาพปก' using errcode = 'insufficient_privilege';
  end if;

  perform 1 from public.products where id = p_product_id for update;

  if not exists (
    select 1 from public.product_images
    where id = p_image_id and product_id = p_product_id
  ) then
    raise exception 'ไม่พบภาพนี้ในสินค้านี้' using errcode = 'no_data_found';
  end if;

  -- The current cover moves to a free slot so unique (product_id, position)
  -- is never momentarily violated.
  update public.product_images
  set position = (
    select coalesce(max(position) + 1, 1)
    from public.product_images
    where product_id = p_product_id
  )
  where product_id = p_product_id
    and position = 0
    and id <> p_image_id;

  update public.product_images
  set position = 0
  where id = p_image_id;
end;
$$;

create or replace function public.set_product_cover(p_product_id uuid, p_image_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  select private.set_product_cover_internal(p_product_id, p_image_id);
$$;

-- ===========================================================================
-- Dashboard
-- ===========================================================================

-- C-33: the admin roster and the audit log carry no SELECT grant, so the
-- dashboard cannot be built by reading them directly. This gate is the single
-- path, and it returns counts rather than rows.
create or replace function public.admin_dashboard_stats_gate()
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'ไม่มีสิทธิ์เข้าถึงสถิติ' using errcode = 'insufficient_privilege';
  end if;

  return jsonb_build_object(
    'products_total',     (select count(*) from public.products),
    'products_available', (select count(*) from public.products where status = 'available'),
    'products_sold',      (select count(*) from public.products where status = 'sold'),
    'products_hidden',    (select count(*) from public.products where not is_visible),
    'categories_total',   (select count(*) from public.games),
    'categories_enabled', (select count(*) from public.games where is_enabled)
  );
end;
$$;


-- ===== 13_rls.sql =====
-- 13_rls.sql
-- Row Level Security — the layer that actually enforces authorisation.
--
-- Every policy is drop-then-create (C-4). An earlier draft used bare
-- `create policy`, which fails on the second run and makes the whole
-- migration non-idempotent.
--
-- Two rules hold throughout:
--   1. is_admin() is the only source of truth. There is no privilege column
--      and no per-table override.
--   2. store_settings and site_sections get NO delete policy (C-4). Reads are
--      public, writes are admin-only, and the deny_delete trigger backs it up.
--
-- Idempotent.

-- ===========================================================================
-- Enable on every table. A table without this is world-readable, which is
-- how the "I forgot one table" class of leak happens.
-- ===========================================================================
alter table public.admins            enable row level security;
alter table public.admin_audit_log   enable row level security;
alter table public.profiles          enable row level security;
alter table public.games             enable row level security;
alter table public.products          enable row level security;
alter table public.product_images    enable row level security;
alter table public.store_settings    enable row level security;
alter table public.site_sections     enable row level security;

-- Belt and braces: a table with RLS enabled but no policy denies everything,
-- which is the correct failure mode for a forgotten policy.
alter table public.admins            force row level security;
alter table public.admin_audit_log   force row level security;

-- ===========================================================================
-- Public reads
-- ===========================================================================

-- A disabled game is hidden from the storefront but its row stays readable
-- by an administrator, so the admin list can show it.
drop policy if exists p_read_games on public.games;
create policy p_read_games on public.games
  for select
  using (is_enabled or public.is_admin());

-- C-9: visibility is two-sided. A product whose game is disabled must leave
-- the catalogue too, or the category page and the product page disagree.
drop policy if exists p_read_products on public.products;
create policy p_read_products on public.products
  for select
  using (
    public.is_admin()
    or (
      is_visible
      and exists (
        select 1 from public.games g
        where g.id = products.game_id and g.is_enabled
      )
    )
  );

-- F-09: the same two conditions as products. Checking only is_visible here
-- left the photos of a hidden product readable by anyone who knew the URL.
drop policy if exists p_read_product_images on public.product_images;
create policy p_read_product_images on public.product_images
  for select
  using (
    public.is_admin()
    or exists (
      select 1
      from public.products p
      join public.games g on g.id = p.game_id
      where p.id = product_images.product_id
        and p.is_visible
        and g.is_enabled
    )
  );

-- The storefront needs the settings row to render the header, the theme and
-- the maintenance gate, so this read is public. Everything in it is
-- administrator-authored and already public by nature.
drop policy if exists p_read_settings on public.store_settings;
create policy p_read_settings on public.store_settings
  for select
  using (true);

drop policy if exists p_read_sections on public.site_sections;
create policy p_read_sections on public.site_sections
  for select
  using (true);

-- ===========================================================================
-- Admin writes
-- ===========================================================================

drop policy if exists p_admin_games on public.games;
create policy p_admin_games on public.games
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists p_admin_products on public.products;
create policy p_admin_products on public.products
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists p_admin_images on public.product_images;
create policy p_admin_images on public.product_images
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- INSERT and UPDATE only. There is deliberately no DELETE policy, and no
-- delete grant in 14_grants.sql; the deny_delete trigger in 11_triggers.sql
-- is the third layer.
drop policy if exists p_admin_settings_insert on public.store_settings;
create policy p_admin_settings_insert on public.store_settings
  for insert
  with check (public.is_admin());

drop policy if exists p_admin_settings_update on public.store_settings;
create policy p_admin_settings_update on public.store_settings
  for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists p_admin_sections_insert on public.site_sections;
create policy p_admin_sections_insert on public.site_sections
  for insert
  with check (public.is_admin());

drop policy if exists p_admin_sections_update on public.site_sections;
create policy p_admin_sections_update on public.site_sections
  for update
  using (public.is_admin())
  with check (public.is_admin());

-- ===========================================================================
-- Profiles: own row only
-- ===========================================================================

drop policy if exists p_own_profile_select on public.profiles;
create policy p_own_profile_select on public.profiles
  for select
  using (id = auth.uid());

drop policy if exists p_own_profile_update on public.profiles;
create policy p_own_profile_update on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ===========================================================================
-- admins / admin_audit_log
--
-- The policies exist so that the security-definer functions can see the
-- rows they need. They are not a grant: no SELECT privilege is issued to
-- `authenticated` in 14_grants.sql (C-33), so no client can read either
-- table. An administrator's own membership is answered by is_admin(), which
-- returns a boolean rather than the roster.
-- ===========================================================================

drop policy if exists p_admins_admin_select on public.admins;
create policy p_admins_admin_select on public.admins
  for select
  using (public.is_admin());

drop policy if exists p_audit_admin_select on public.admin_audit_log;
create policy p_audit_admin_select on public.admin_audit_log
  for select
  using (public.is_admin());

drop policy if exists p_audit_admin_insert on public.admin_audit_log;
create policy p_audit_admin_insert on public.admin_audit_log
  for insert
  with check (public.is_admin());


-- ===== 14_grants.sql =====
-- 14_grants.sql
-- Every privilege statement in the project lives in this file (C-31).
-- No other migration may grant anything. Two subsystems previously issued
-- competing grants for the same function, and neither list was complete, so a
-- call that one of them did not know about simply failed at runtime.
--
-- Supabase ships with broad default privileges for anon and authenticated.
-- Those are revoked first, then the minimum required set is re-granted:
-- everything denied by default, then opened one door at a time.
--
-- Idempotent: revoke/grant are inherently repeatable.

-- ===========================================================================
-- Close the defaults
-- ===========================================================================
revoke all on schema public from anon, authenticated;

alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;

-- F-07: private is never reachable from the Data API, by anyone, ever.
revoke all on schema private from public, anon, authenticated;
alter default privileges in schema private revoke all on functions from public, anon, authenticated;

-- ===========================================================================
-- Schema usage
-- ===========================================================================
grant usage on schema public to anon, authenticated;

-- ===========================================================================
-- Table privileges
-- ===========================================================================

-- ALTER DEFAULT PRIVILEGES above only governs tables created AFTER it runs, so
-- it never touched the eight tables that migrations 03-09 had already created.
-- Supabase ships those with broad grants to anon and authenticated, and nothing
-- in this file withdrew them — the file revoked the defaults, granted the
-- minimum back, and left every pre-existing grant standing.
--
-- The observable consequence was C-33 failing in the database rather than in
-- the contract: an anonymous caller could select from public.admins and
-- public.admin_audit_log. RLS still hid the rows, so nothing leaked, but the
-- roster was one missing policy away from being readable by every visitor.
--
-- A blanket revoke first, then one door at a time below, is the only way to
-- make "no grant" actually mean no grant.
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- Public read: what the storefront renders.
grant select on
  public.games,
  public.products,
  public.product_images,
  public.store_settings,
  public.site_sections
to anon, authenticated;

-- Admin write. Note the asymmetry: games, products and product_images can be
-- deleted; store_settings and site_sections cannot (C-4).
grant insert, update, delete on
  public.games,
  public.products,
  public.product_images
to authenticated;

grant insert, update on
  public.store_settings,
  public.site_sections
to authenticated;

-- Profiles: own row.
grant select, update on public.profiles to authenticated;

-- admin_audit_log: INSERT only. Even an administrator has no SELECT here
-- (C-33) — the dashboard reads admin_dashboard_stats_gate() instead.
grant insert on public.admin_audit_log to authenticated;

-- C-33: NO grant on public.admins at all. The roster is not readable by any
-- client, administrator or not; is_admin() answers the only question the
-- application asks.
--
-- C-33 also rules out `grant all on all sequences`. Sequences are granted
-- individually, and only where the client genuinely inserts: the identity
-- column on admin_audit_log, which write_audit() feeds.
grant usage, select on sequence public.admin_audit_log_id_seq to authenticated;

-- ===========================================================================
-- Function privileges
--
-- CREATE FUNCTION grants EXECUTE to PUBLIC by default, so every function is
-- revoked first. A validation helper that anonymous callers can execute is a
-- function that anonymous callers can use to probe stored values.
-- ===========================================================================
revoke execute on function public.is_safe_link(text)               from public;
revoke execute on function public.is_safe_social(text)             from public;
revoke execute on function public.is_media_path(text)              from public;
revoke execute on function public.is_media_path_for_bucket(text, text) from public;

revoke execute on function public.is_admin()                       from public;
revoke execute on function public.search_products(text, text, public.product_status, public.product_currency, bigint, bigint, text, int, int) from public;
revoke execute on function public.get_product_detail(text)        from public;
revoke execute on function public.get_site_shell()                 from public;
revoke execute on function public.game_catalog_cards()             from public;
revoke execute on function public.admin_dashboard_stats_gate()     from public;
revoke execute on function public.grant_admin(uuid)                from public;
revoke execute on function public.revoke_admin(uuid)               from public;
revoke execute on function public.write_audit(text, text, text, jsonb) from public;
revoke execute on function public.append_product_images(uuid, jsonb)   from public;
revoke execute on function public.set_product_cover(uuid, uuid)        from public;

-- Private: the default PUBLIC execute grant has to go explicitly, because
-- F-07 depends on it.
revoke execute on function private.is_admin_internal(uuid)             from public;
revoke execute on function private.grant_admin_internal(uuid)          from public;
revoke execute on function private.revoke_admin_internal(uuid)         from public;
revoke execute on function private.write_audit_internal(text, text, text, jsonb) from public;
revoke execute on function private.append_product_images_internal(uuid, jsonb)   from public;
revoke execute on function private.set_product_cover_internal(uuid, uuid)        from public;
revoke execute on function private.set_updated_at()                    from public;
revoke execute on function private.products_search_text()              from public;
revoke execute on function private.games_refresh_search_text()         from public;
revoke execute on function private.products_featured_at()              from public;
revoke execute on function private.deny_delete()                       from public;
revoke execute on function private.handle_new_user()                   from public;

-- ===========================================================================
-- Public reads — callable by anonymous visitors
-- ===========================================================================
grant execute on function public.is_admin()             to anon, authenticated;
grant execute on function public.get_site_shell()       to anon, authenticated;
grant execute on function public.game_catalog_cards()   to anon, authenticated;
grant execute on function public.search_products(text, text, public.product_status, public.product_currency, bigint, bigint, text, int, int)
  to anon, authenticated;
grant execute on function public.get_product_detail(text) to anon, authenticated;

-- ===========================================================================
-- Admin only
--
-- The guard on each of these is the is_admin() check inside the private
-- implementation, not the GRANT. A grant controls who may attempt the call;
-- only the function decides whether it succeeds.
-- ===========================================================================
grant execute on function public.admin_dashboard_stats_gate()  to authenticated;
grant execute on function public.grant_admin(uuid)             to authenticated;
grant execute on function public.revoke_admin(uuid)            to authenticated;
grant execute on function public.write_audit(text, text, text, jsonb) to authenticated;
grant execute on function public.append_product_images(uuid, jsonb)   to authenticated;
grant execute on function public.set_product_cover(uuid, uuid)        to authenticated;

-- handle_new_user, set_updated_at, deny_delete and the search-text helpers
-- are trigger functions. They are invoked by a trigger, never called, so
-- they receive no grant.


-- ===== 15_storage.sql =====
-- 15_storage.sql
-- Two buckets, and only two (C-3). An earlier draft also created a
-- `branding` bucket, which left the brand assets split across two places and
-- made "which bucket does this path belong to" answerable two ways.
--
--   product-media   product gallery images
--   brand-assets    logo, favicon, OG image, category images
--
-- file_size_limit and allowed_mime_types are the database half of
-- src/lib/images/limits.ts. Both must say the same thing: 3.5 MB, and the
-- MIME sets the Thai copy advertises (F-14).
--
-- F-04: an object's key is relative to its bucket and never repeats the
-- bucket name. See 01_extensions_and_helpers.sql::is_media_path for the shape
-- the CHECK constraints enforce.
--
-- Idempotent.

-- ===========================================================================
-- Buckets
-- ===========================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-media', 'product-media', true, 3500000,
    array['image/webp', 'image/jpeg', 'image/png', 'image/avif']),
  ('brand-assets', 'brand-assets', true, 3500000,
    array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- brand-assets excludes AVIF: the OG renderer (ImageResponse) cannot decode
-- it, so accepting it would produce an admin asset that breaks social previews.
--
-- ===========================================================================
-- Policies
--
-- F-08: every one of these is drop-then-create. A bare `create policy` fails
-- on the second run, and a partially applied migration is worse than none.
--
-- F-08 also rules out an open listing policy. `for select using (true)` on
-- storage.objects would let an anonymous caller enumerate every object key in
-- the project, which is a directory of the entire catalogue.
-- ===========================================================================

-- Read: the two buckets are public, so this mirrors what the CDN already
-- serves. It exists for consistency, not to widen access.
drop policy if exists media_public_read on storage.objects;
create policy media_public_read on storage.objects
  for select
  using (bucket_id in ('product-media', 'brand-assets'));

-- Write: administrators only. The bucket's own public flag governs anonymous
-- access to the public URL; this policy governs the management API.
drop policy if exists media_admin_insert on storage.objects;
create policy media_admin_insert on storage.objects
  for insert
  with check (
    bucket_id in ('product-media', 'brand-assets')
    and public.is_admin()
  );

drop policy if exists media_admin_update on storage.objects;
create policy media_admin_update on storage.objects
  for update
  using (
    bucket_id in ('product-media', 'brand-assets')
    and public.is_admin()
  )
  with check (
    bucket_id in ('product-media', 'brand-assets')
    and public.is_admin()
  );

drop policy if exists media_admin_delete on storage.objects;
create policy media_admin_delete on storage.objects
  for delete
  using (
    bucket_id in ('product-media', 'brand-assets')
    and public.is_admin()
  );

-- ===========================================================================
-- Path shape as a storage-level backstop
--
-- The CHECK constraints on the tables already reject a malformed path. This
-- trigger catches an upload whose key was built in application code and
-- stored nowhere — the object would exist, be served, and never be reachable
-- from a row, so it could never be deleted.
-- ===========================================================================
create or replace function private.guard_media_key()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.bucket_id in ('product-media', 'brand-assets')
     and not public.is_media_path(new.name) then
    raise exception
      'รูปแบบ path ไม่ถูกต้อง: % (ต้องไม่มีชื่อ bucket นำหน้า)', new.name
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_media_key on storage.objects;
create trigger trg_guard_media_key
  before insert or update of name on storage.objects
  for each row execute function private.guard_media_key();

revoke execute on function private.guard_media_key() from public;


-- ===== 16_views_and_guards.sql =====
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

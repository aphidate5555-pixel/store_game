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
  with filtered as (
    select p.*
    from public.products p
    join public.games g on g.id = p.game_id
    where p.is_visible
      and g.is_enabled
      and p.currency = p_currency
      and (p_status is null or p.status = p_status)
      and (p_min is null or p.price_amount >= p_min)
      and (p_max is null or p.price_amount <= p_max)
      and (p_game_slug is null or g.slug = p_game_slug)
      and (
        p_pattern is null
        or p.search_text ilike ('%' || p_pattern || '%') escape '!'
      )
  ),
  paged as (
    select f.*
    from filtered f
    order by
      case when p_sort = 'price_asc'  then f.price_amount end asc nulls last,
      case when p_sort = 'price_desc' then f.price_amount end desc nulls last,
      case when p_sort = 'oldest'     then f.created_at   end asc nulls last,
      f.created_at desc,
      f.product_code asc
    limit least(greatest(coalesce(p_limit, 24), 1), 100)
    offset greatest(coalesce(p_offset, 0), 0)
  )
  select
    coalesce(
      (select array_agg(row(pg.*)::public.products) from paged pg),
      '{}'::public.products[]
    ),
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

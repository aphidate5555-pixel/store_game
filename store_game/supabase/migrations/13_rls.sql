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

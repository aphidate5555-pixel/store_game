-- 10_indexes.sql
-- Indexes created after the tables, so a partial index can reference columns
-- whose constraint already exists.
--
-- The trigram index sits on search_text, not on name (C-18). The storefront
-- promises that searching matches the product code, the product name and the
-- game name; search_text is the column that actually contains all three, so
-- an index on name would leave the two most common searches unindexed.
--
-- Idempotent: create index if not exists.

-- Primary search surface: code + name + game name, maintained by trigger.
create index if not exists products_search_trgm_idx
  on public.products using gin (search_text gin_trgm_ops);

-- The main catalogue listing: filter by game, currency and status, then sort
-- by price. Partial on is_visible because hidden products are never listed.
create index if not exists products_visible_price_idx
  on public.products (game_id, currency, status, price_amount desc)
  where is_visible;

-- Default sort for /products and the homepage.
create index if not exists products_visible_created_idx
  on public.products (created_at desc)
  where is_visible;

-- The featured shelf.
create index if not exists products_featured_idx
  on public.products (featured_at desc)
  where is_visible and featured_at is not null;

-- Gallery ordering and the cover lookup (position = 0).
create index if not exists product_images_product_position_idx
  on public.product_images (product_id, position);

-- Category navigation.
create index if not exists games_enabled_position_idx
  on public.games (position)
  where is_enabled;

-- The sitemap pages order by product_code and window with .range(); without
-- this the paginated crawl degrades to a sort of the whole table per page.
create index if not exists products_code_idx
  on public.products (product_code);

-- Admin dashboard counts.
create index if not exists products_status_idx
  on public.products (status)
  where is_visible;

-- is_admin() reads this on every policy evaluation, so it is partial on the
-- active rows only.
create index if not exists admins_active_idx
  on public.admins (user_id)
  where revoked_at is null;

-- Audit reads for the admin history.
create index if not exists admin_audit_log_created_idx
  on public.admin_audit_log (created_at desc);

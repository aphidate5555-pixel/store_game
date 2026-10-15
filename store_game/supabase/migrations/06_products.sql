-- 06_products.sql
-- The catalogue.
--
-- Note what is NOT here: a cover column (F-05). The cover of a product is
-- the product_images row whose position is 0. Duplicating that state in a
-- column would let the two disagree, and every read would then need a rule
-- for which one wins.
--
-- search_text is maintained by trigger (11_triggers.sql) and carries the
-- product code, the product name and the game name, because the storefront
-- promises that searching finds all three.
--
-- Idempotent.

create table if not exists public.products (
  id            uuid primary key default gen_random_uuid(),
  product_code  text not null unique,
  name          text not null,
  -- RESTRICT rather than CASCADE: deleting a game with products under it is
  -- refused by the admin action with a clear message, never silently
  -- destroying the catalogue.
  game_id       uuid not null references public.games (id) on delete restrict,

  price_amount  bigint not null,
  currency      public.product_currency not null default 'THB',
  rank          text,
  hero_count    integer not null default 0,
  skin_count    integer not null default 0,
  binding       public.product_binding,

  description   text,
  status        public.product_status not null default 'available',
  is_visible    boolean not null default true,

  -- Search surface; not written by the application.
  search_text   text,
  featured_at   timestamptz,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint products_code_format check (product_code ~ '^[A-Za-z0-9][A-Za-z0-9-]{1,31}$'),
  constraint products_name_length  check (char_length(name) between 1 and 120),
  constraint products_price_non_negative check (price_amount >= 0),
  -- The kip has no subunit in practice, so a fractional value is a data entry
  -- error rather than a price.
  constraint products_lak_integer check (
    currency <> 'LAK' or price_amount = trunc(price_amount)
  ),
  constraint products_hero_count_non_negative check (hero_count >= 0),
  constraint products_skin_count_non_negative check (skin_count >= 0),
  constraint products_rank_length check (rank is null or char_length(rank) <= 32),
  constraint products_description_length check (
    description is null or char_length(description) <= 2000
  )
);

comment on table public.products is
  'ไม่มี cover column — ปกคือ product_images.position = 0 (F-05)';
comment on column public.products.search_text is
  'product_code + name + ชื่อเกม สร้างโดย trigger ไม่ใช่โดยแอป';

-- Indexes live in 10_indexes.sql so every one of them can be reviewed in a
-- single place; this file only owns the table.

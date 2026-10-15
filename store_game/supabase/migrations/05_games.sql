-- 05_games.sql
-- Game categories. A disabled game keeps its URL reachable, so an old link
-- still resolves, but it disappears from navigation and its products leave
-- the public catalogue.
--
-- Idempotent.

create table if not exists public.games (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  name         text not null,
  description  text,
  -- Bucket-relative path, no bucket prefix (F-04), CHECK-validated (F-10).
  image_path   text,
  is_enabled   boolean not null default true,
  position     integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint games_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint games_slug_length  check (char_length(slug) between 1 and 80),
  constraint games_name_length  check (char_length(name) between 1 and 80),
  constraint games_image_path_is_media check (
    image_path is null or public.is_media_path(image_path)
  )
);

comment on column public.games.image_path is
  'path ภายใน bucket เท่านั้น เช่น brand/category/2026-03/ab12cd34ef567890.png (F-04)';

-- Indexes live in 10_indexes.sql.

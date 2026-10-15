-- 07_product_images.sql
-- One row per uploaded file, holding both output variants (C-15).
--
--   storage_path  the 640px card, ends in '-card.webp'
--   full_path     the 1600px original, ends in '.webp'
--
-- There is no array column. An earlier draft stored both variants in a
-- text[]; that shape made it impossible to record a width, an alt text or a
-- position per image, and it is what allowed a 1600px file to exist with no
-- row pointing at it — unserved, undeleted, leaked forever.
--
-- `position = 0` IS the cover (F-05). There is no separate flag.
--
-- Idempotent.

create table if not exists public.product_images (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products (id) on delete cascade,

  storage_path text not null,
  full_path    text not null,
  width        integer,
  height       integer,

  position     integer not null default 0,
  alt          text,
  created_at   timestamptz not null default now(),

  -- Makes a concurrent insert that reserved the same slot fail loudly rather
  -- than produce two images claiming position 0. The reservation itself
  -- happens inside append_product_images_internal() under a row lock (C-16),
  -- so this constraint is the backstop, not the mechanism.
  constraint product_images_unique_position unique (product_id, position),

  -- F-04 + F-10: bucket-relative paths, shape enforced by the database.
  constraint product_images_storage_path_is_media
    check (public.is_media_path(storage_path)),
  constraint product_images_full_path_is_media
    check (public.is_media_path(full_path)),

  -- The card is the narrower of the two. Asserting the suffix here means a
  -- bug that swaps the two columns fails at write time, not as a squashed
  -- product image in the grid.
  constraint product_images_storage_is_card
    check (storage_path ~ '-card\.webp$'),
  constraint product_images_full_is_original
    check (full_path !~ '-card\.webp$'),

  constraint product_images_position_non_negative check (position >= 0),
  constraint product_images_alt_length check (alt is null or char_length(alt) <= 120),
  constraint product_images_dimensions check (
    (width is null or width > 0) and (height is null or height > 0)
  )
);

comment on table public.product_images is
  'หนึ่งแถวต่อไฟล์ที่อัปโหลด — position = 0 คือปก (F-05) ไม่มี array column (C-15)';

-- Indexes live in 10_indexes.sql.

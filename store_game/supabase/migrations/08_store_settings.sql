-- 08_store_settings.sql
-- The single settings row, id = true.
--
-- The boolean primary key with `check (id)` is what makes the table a
-- singleton at the schema level: a second row cannot be inserted at all,
-- whatever the application does. Every read uses
-- `.eq('id', true).maybeSingle()`.
--
-- whatsapp_number holds DIGITS ONLY (C-11). There is no whatsapp_link
-- column: a stored link cannot be proven to match the number, so the two
-- could disagree and the storefront would link to somebody else's chat.
--
-- version drives optimistic concurrency (C-36). updated_at alone is not
-- enough: a timestamptz survives a toISOString() round trip at microsecond
-- resolution, and two administrators saving within the same microsecond
-- would both succeed with the last write silently winning.
--
-- Idempotent.

create table if not exists public.store_settings (
  id     boolean primary key default true check (id),

  -- Identity
  store_name        text not null default '',
  store_description text not null default '',

  -- Brand assets: bucket-relative paths (F-04), CHECK-validated (F-10).
  logo_path             text,
  favicon_path          text,
  default_og_image_path text,

  -- Six-digit HEX only. Named colours and three-digit forms are rejected so
  -- nothing can reach the `style` attribute of <html> that is not provably
  -- a colour (P3 gamut aside).
  primary_color text not null default '#E11D2E',
  accent_color  text not null default '#F59E0B',

  -- C-11: digits only, 8-15, no leading +.
  whatsapp_number text,

  -- Social links, https and allowlisted host only.
  facebook_url  text,
  tiktok_url    text,
  instagram_url text,

  footer_text       text not null default '',
  footer_disclaimer text not null default '',

  floating_whatsapp_enabled boolean not null default true,
  floating_whatsapp_text    text not null default 'ทักร้าน',

  business_hours text not null default '',

  -- C-26: the maintenance gate.
  maintenance_mode    boolean not null default false,
  maintenance_message text not null default 'เว็บไซต์กำลังปรับปรุง',

  -- SEO overrides. Null means "use the dictionary value".
  seo_title       text,
  seo_description text,

  default_currency public.product_currency not null default 'THB',

  -- C-36
  version    integer not null default 0,
  updated_at timestamptz not null default now(),

  constraint settings_primary_hex check (public.is_safe_link(primary_color)),
  constraint settings_accent_hex  check (public.is_safe_link(accent_color)),

  constraint settings_whatsapp_digits check (
    whatsapp_number is null or whatsapp_number ~ '^[0-9]{8,15}$'
  ),

  constraint settings_social_facebook check (
    facebook_url is null or public.is_safe_social(facebook_url)
  ),
  constraint settings_social_tiktok check (
    tiktok_url is null or public.is_safe_social(tiktok_url)
  ),
  constraint settings_social_instagram check (
    instagram_url is null or public.is_safe_social(instagram_url)
  ),

  -- F-10: the database enforces the path shape, not just TypeScript.
  constraint settings_logo_path_is_media check (
    logo_path is null or public.is_media_path(logo_path)
  ),
  constraint settings_favicon_path_is_media check (
    favicon_path is null or public.is_media_path(favicon_path)
  ),
  constraint settings_og_image_path_is_media check (
    default_og_image_path is null or public.is_media_path(default_og_image_path)
  ),

  constraint settings_store_name_length check (char_length(store_name) <= 80),
  constraint settings_floating_text_length check (char_length(floating_whatsapp_text) <= 12),
  constraint settings_seo_title_length check (seo_title is null or char_length(seo_title) <= 70),
  constraint settings_seo_description_length check (
    seo_description is null or char_length(seo_description) <= 200
  ),
  constraint settings_version_non_negative check (version >= 0)
);

comment on table public.store_settings is
  'แถวเดียว id = true · ไม่มี whatsapp_link มีแต่เลข (C-11)';
comment on column public.store_settings.version is
  'ใช้ตรวจการแก้ไขชนกัน (C-36) — updated_at ไม่พอ';

-- The singleton row. Every later grant assumes it exists.
insert into public.store_settings (id) values (true) on conflict (id) do nothing;

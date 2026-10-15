-- 04_profiles.sql
-- Display data only. This table plays no part in authorisation: it is not
-- referenced by is_admin() and grants no capability.
--
-- There is deliberately no "administrator display name" column here (C-2/C-5).
-- The dashboard greeting comes from auth.users.user_metadata.full_name, and
-- adding an admin name column to a public table would put it one anonymous
-- SELECT away.
--
-- Idempotent.

create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text,
  created_at    timestamptz not null default now(),
  constraint profiles_display_name_length check (
    display_name is null or char_length(display_name) <= 80
  )
);

comment on table public.profiles is
  'ข้อมูลแสดงผลเท่านั้น ไม่เกี่ยวกับสิทธิ์ใด ๆ';

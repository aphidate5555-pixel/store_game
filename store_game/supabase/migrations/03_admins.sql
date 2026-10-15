-- 03_admins.sql
-- The one and only representation of "is an administrator": a row here, with
-- revoked_at null. There is no privilege column, no role column and no
-- per-table override (C-4). is_admin() reads exactly this table.
--
-- public.admins carries no grant for `authenticated` (C-33): the roster is
-- never readable through the Data API, only through
-- admin_dashboard_stats_gate() and the security-definer functions.
--
-- Idempotent: create table if not exists.

create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  granted_at  timestamptz not null default now(),
  revoked_at  timestamptz,
  -- A revoked grant and an active one are mutually exclusive.
  constraint admins_revocation_consistent
    check (revoked_at is null or revoked_at >= granted_at)
);

comment on table public.admins is
  'รายชื่อผู้ดูแลระบบ — ไม่มี grant ให้ authenticated อ่านโดยตรง (C-33)';

-- ---------------------------------------------------------------------------
-- admin_audit_log
--
-- The project's only audit table (C-4). An earlier draft added a separate
-- settings_audit table that no grant and no guard test knew about, so it
-- could have been written to without appearing anywhere.
--
-- No SELECT grant for `authenticated` (C-33): the table records who changed
-- what, and a readable log is a directory of the admin accounts. Writes go
-- through write_audit(), which is the only INSERT path.
-- ---------------------------------------------------------------------------
create table if not exists public.admin_audit_log (
  id         bigint generated always as identity primary key,
  actor_id   uuid,
  action     text not null,
  entity     text not null,
  entity_id  text,
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint admin_audit_action_length check (char_length(action) between 1 and 64),
  constraint admin_audit_entity_length check (char_length(entity) between 1 and 64),
  constraint admin_audit_meta_is_object check (jsonb_typeof(meta) = 'object')
);

comment on table public.admin_audit_log is
  'ประวัติการแก้ไขฝั่งผู้ดูแล — public อ่านไม่ได้ · เขียนผ่าน write_audit() เท่านั้น';

-- Indexes live in 10_indexes.sql.

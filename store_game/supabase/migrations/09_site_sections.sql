-- 09_site_sections.sql
-- Homepage section configuration (C-2).
--
-- One shape only: (section_key, payload). An earlier draft offered
-- (key, visible), which cannot carry the hero headline, the menu items or the
-- footer text that administrators are supposed to be able to edit — the whole
-- reason this table exists.
--
--   payload.enabled = false   turns the section off
--   no order_index            the order is a product decision, not data
--
-- The seven keys are fixed by the CHECK so a typo becomes an insert error
-- rather than a section that silently never renders.
--
-- Idempotent.

create table if not exists public.site_sections (
  section_key text primary key,
  payload     jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),

  constraint site_sections_key check (
    section_key in (
      'hero',
      'trust',
      'categories',
      'featured_products',
      'all_products',
      'navigation',
      'footer'
    )
  ),

  -- `enabled` must be a real boolean when present. A payload carrying
  -- "enabled": "false" (a string) would be truthy in JavaScript and turn the
  -- section off in the opposite way from what the administrator intended.
  constraint site_sections_enabled_is_boolean check (
    payload -> 'enabled' is null
    or jsonb_typeof(payload -> 'enabled') = 'boolean'
  ),

  constraint site_sections_payload_is_object check (jsonb_typeof(payload) = 'object')
);

comment on table public.site_sections is
  'payload เก็บข้อความที่แอดมินแก้ได้ · ปิดส่วนด้วย payload.enabled = false (C-2)';
comment on column public.site_sections.section_key is
  'ลำดับมาจาก HOME_SECTION_ORDER ใน src/lib/home/section-order.ts ไม่มี order_index';

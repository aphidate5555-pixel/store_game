-- 15_storage.sql
-- Two buckets, and only two (C-3). An earlier draft also created a
-- `branding` bucket, which left the brand assets split across two places and
-- made "which bucket does this path belong to" answerable two ways.
--
--   product-media   product gallery images
--   brand-assets    logo, favicon, OG image, category images
--
-- file_size_limit and allowed_mime_types are the database half of
-- src/lib/images/limits.ts. Both must say the same thing: 3.5 MB, and the
-- MIME sets the Thai copy advertises (F-14).
--
-- F-04: an object's key is relative to its bucket and never repeats the
-- bucket name. See 01_extensions_and_helpers.sql::is_media_path for the shape
-- the CHECK constraints enforce.
--
-- Idempotent.

-- ===========================================================================
-- Buckets
-- ===========================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-media', 'product-media', true, 3500000,
    array['image/webp', 'image/jpeg', 'image/png', 'image/avif']),
  ('brand-assets', 'brand-assets', true, 3500000,
    array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- brand-assets excludes AVIF: the OG renderer (ImageResponse) cannot decode
-- it, so accepting it would produce an admin asset that breaks social previews.
--
-- ===========================================================================
-- Policies
--
-- F-08: every one of these is drop-then-create. A bare `create policy` fails
-- on the second run, and a partially applied migration is worse than none.
--
-- F-08 also rules out an open listing policy. `for select using (true)` on
-- storage.objects would let an anonymous caller enumerate every object key in
-- the project, which is a directory of the entire catalogue.
-- ===========================================================================

-- Read: the two buckets are public, so this mirrors what the CDN already
-- serves. It exists for consistency, not to widen access.
drop policy if exists media_public_read on storage.objects;
create policy media_public_read on storage.objects
  for select
  using (bucket_id in ('product-media', 'brand-assets'));

-- Write: administrators only. The bucket's own public flag governs anonymous
-- access to the public URL; this policy governs the management API.
drop policy if exists media_admin_insert on storage.objects;
create policy media_admin_insert on storage.objects
  for insert
  with check (
    bucket_id in ('product-media', 'brand-assets')
    and public.is_admin()
  );

drop policy if exists media_admin_update on storage.objects;
create policy media_admin_update on storage.objects
  for update
  using (
    bucket_id in ('product-media', 'brand-assets')
    and public.is_admin()
  )
  with check (
    bucket_id in ('product-media', 'brand-assets')
    and public.is_admin()
  );

drop policy if exists media_admin_delete on storage.objects;
create policy media_admin_delete on storage.objects
  for delete
  using (
    bucket_id in ('product-media', 'brand-assets')
    and public.is_admin()
  );

-- ===========================================================================
-- Path shape as a storage-level backstop
--
-- The CHECK constraints on the tables already reject a malformed path. This
-- trigger catches an upload whose key was built in application code and
-- stored nowhere — the object would exist, be served, and never be reachable
-- from a row, so it could never be deleted.
-- ===========================================================================
create or replace function private.guard_media_key()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.bucket_id in ('product-media', 'brand-assets')
     and not public.is_media_path(new.name) then
    raise exception
      'รูปแบบ path ไม่ถูกต้อง: % (ต้องไม่มีชื่อ bucket นำหน้า)', new.name
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_media_key on storage.objects;
create trigger trg_guard_media_key
  before insert or update of name on storage.objects
  for each row execute function private.guard_media_key();

revoke execute on function private.guard_media_key() from public;

-- 01_extensions_and_helpers.sql
-- Validation helpers used as CHECK constraints.
--
-- These functions are the database half of a defence that also exists in
-- TypeScript. The TypeScript copy lives in src/lib/validation/url.ts and the
-- two host sets MUST stay identical; tests/unit/sql-allowlist-parity.test.ts
-- reads this file and fails if they drift.
--
-- Idempotent: create or replace.

-- ---------------------------------------------------------------------------
-- is_safe_link(value)
--   General-purpose link check. Returns true for the '#rrggbb' colours the
--   brand fields hold, so one function serves both purposes.
-- ---------------------------------------------------------------------------
create or replace function public.is_safe_link(value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value is not null and value ~ '^#[0-9a-fA-F]{6}$';
$$;

-- ---------------------------------------------------------------------------
-- is_safe_social(value)
--   Only https, and only the exact hostnames the storefront is allowed to
--   link to. A prefix comparison would accept
--   'https://www.facebook.com.evil.com/', so the host is matched exactly
--   after parsing the URL.
-- ---------------------------------------------------------------------------
create or replace function public.is_safe_social(value text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  parsed_host text;
  parsed_scheme text;
begin
  if value is null or value = '' then
    return false;
  end if;

  -- Reject anything with an embedded scheme before parsing, so a value like
  -- 'javascript:https://facebook.com' cannot be reinterpreted.
  if value ~ '[^a-zA-Z0-9:/._~?#\[\]@!$&()*+,;=%-]' then
    return false;
  end if;

  parsed_scheme := split_part(value, ':', 1);
  if lower(parsed_scheme) <> 'https' then
    return false;
  end if;

  -- Strip the scheme, then the credentials, then the path.
  parsed_host := split_part(split_part(value, '://', 2), '/', 1);
  parsed_host := split_part(parsed_host, '@', 2); -- drop user:pass@
  parsed_host := lower(split_part(parsed_host, ':', 1));

  return parsed_host in (
    'facebook.com', 'www.facebook.com',
    'tiktok.com', 'www.tiktok.com',
    'instagram.com', 'www.instagram.com',
    'wa.me', 'api.whatsapp.com', 'm.me'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- is_media_path(value)
--   Enforces the object path shape (F-04, F-10).
--
--   The path stored in the database is relative to its bucket and NEVER
--   carries the bucket name as a prefix. Two shapes are accepted:
--
--     products/<uuid>/<YYYY-MM>/<16hex>.webp          1600px
--     products/<uuid>/<YYYY-MM>/<16hex>-card.webp    640px
--     brand/<kind>/<YYYY-MM>/<16hex>.png
--
--   A value like 'product-media/products/...' is rejected: that shape came
--   from an earlier draft in which the bucket was duplicated into the column.
-- ---------------------------------------------------------------------------
create or replace function public.is_media_path(value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value is not null
    and value !~ '\.\.'
    and value !~ '^/'
    and (
      value ~ '^products/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9]{4}-(0[1-9]|1[0-2])/[0-9a-f]{16}(-card)?\.webp$'
      or
      value ~ '^brand/(logo|favicon|og|category)/[0-9]{4}-(0[1-9]|1[0-2])/[0-9a-f]{16}\.png$'
    );
$$;

-- Kept for callers that pass the bucket explicitly. The bucket argument is
-- validated for shape only and is deliberately NOT part of the stored path.
create or replace function public.is_media_path_for_bucket(bucket_name text, value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select bucket_name in ('product-media', 'brand-assets')
     and public.is_media_path(value);
$$;

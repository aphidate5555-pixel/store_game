-- 11_triggers.sql
-- Triggers created after every table they touch exists.
--
-- Idempotent: drop if exists before create.

-- ---------------------------------------------------------------------------
-- set_updated_at
-- ---------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_admins_updated_at on public.admins;
create trigger trg_admins_updated_at
  before update on public.admins
  for each row execute function private.set_updated_at();

drop trigger if exists trg_games_updated_at on public.games;
create trigger trg_games_updated_at
  before update on public.games
  for each row execute function private.set_updated_at();

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
  before update on public.products
  for each row execute function private.set_updated_at();

drop trigger if exists trg_store_settings_updated_at on public.store_settings;
create trigger trg_store_settings_updated_at
  before update on public.store_settings
  for each row execute function private.set_updated_at();

drop trigger if exists trg_site_sections_updated_at on public.site_sections;
create trigger trg_site_sections_updated_at
  before update on public.site_sections
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- search_text (C-18)
--
-- The storefront promises that a search matches the product code, the product
-- name AND the game name. Assembling all three here is what makes that promise
-- true, and it is also what the trigram index covers.
-- ---------------------------------------------------------------------------
create or replace function private.products_search_text()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  game_name text;
begin
  select g.name into game_name
  from public.games g
  where g.id = new.game_id;

  new.search_text := lower(
    coalesce(new.product_code, '') || ' ' ||
    coalesce(new.name, '') || ' ' ||
    coalesce(game_name, '')
  );

  return new;
end;
$$;

drop trigger if exists trg_products_search_text on public.products;
create trigger trg_products_search_text
  before insert or update of product_code, name, game_id on public.products
  for each row execute function private.products_search_text();

-- Renaming a game has to reindex its products, or a search for the new name
-- finds nothing while the old name still matches.
create or replace function private.games_refresh_search_text()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.products
  set search_text = lower(
    coalesce(product_code, '') || ' ' ||
    coalesce(name, '') || ' ' ||
    coalesce(new.name, '')
  )
  where game_id = new.id;

  return new;
end;
$$;

drop trigger if exists trg_games_refresh_search_text on public.games;
create trigger trg_games_refresh_search_text
  after update of name on public.games
  for each row execute function private.games_refresh_search_text();

-- ---------------------------------------------------------------------------
-- featured_at
-- A product that stops being featured must leave the shelf, not linger with
-- a stale timestamp.
-- ---------------------------------------------------------------------------
create or replace function private.products_featured_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.featured_at is distinct from old.featured_at then
    if new.featured_at is not null then
      new.featured_at := coalesce(new.featured_at, now());
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_products_featured_at on public.products;
create trigger trg_products_featured_at
  before update of featured_at on public.products
  for each row execute function private.products_featured_at();

-- ---------------------------------------------------------------------------
-- deny_delete_settings (C-4)
--
-- store_settings and site_sections are singleton-ish configuration. A delete
-- grant would let one mistake blank the entire storefront, and there is no UI
-- that offers it. The trigger is the backstop; the missing grant is the
-- primary defence.
-- ---------------------------------------------------------------------------
create or replace function private.deny_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'ลบ % ไม่ได้ — ตารางนี้เป็นการตั้งค่าของร้าน', tg_table_name
    using errcode = 'restrict_violation';
end;
$$;

drop trigger if exists trg_deny_delete_store_settings on public.store_settings;
create trigger trg_deny_delete_store_settings
  before delete on public.store_settings
  for each row execute function private.deny_delete();

drop trigger if exists trg_deny_delete_site_sections on public.site_sections;
create trigger trg_deny_delete_site_sections
  before delete on public.site_sections
  for each row execute function private.deny_delete();

-- ---------------------------------------------------------------------------
-- handle_new_user
-- Creates the profile row. Email sign-up is disabled at the Supabase Auth
-- level (C-32), so in practice this only fires for users an administrator
-- created from the dashboard.
-- ---------------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_handle_new_user on auth.users;
create trigger trg_handle_new_user
  after insert on auth.users
  for each row execute function private.handle_new_user();

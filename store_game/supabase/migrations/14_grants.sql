-- 14_grants.sql
-- Every privilege statement in the project lives in this file (C-31).
-- No other migration may grant anything. Two subsystems previously issued
-- competing grants for the same function, and neither list was complete, so a
-- call that one of them did not know about simply failed at runtime.
--
-- Supabase ships with broad default privileges for anon and authenticated.
-- Those are revoked first, then the minimum required set is re-granted:
-- everything denied by default, then opened one door at a time.
--
-- Idempotent: revoke/grant are inherently repeatable.

-- ===========================================================================
-- Close the defaults
-- ===========================================================================
revoke all on schema public from anon, authenticated;

alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;

-- F-07: private is never reachable from the Data API, by anyone, ever.
revoke all on schema private from public, anon, authenticated;
alter default privileges in schema private revoke all on functions from public, anon, authenticated;

-- ===========================================================================
-- Schema usage
-- ===========================================================================
grant usage on schema public to anon, authenticated;

-- ===========================================================================
-- Table privileges
-- ===========================================================================

-- ALTER DEFAULT PRIVILEGES above only governs tables created AFTER it runs, so
-- it never touched the eight tables that migrations 03-09 had already created.
-- Supabase ships those with broad grants to anon and authenticated, and nothing
-- in this file withdrew them — the file revoked the defaults, granted the
-- minimum back, and left every pre-existing grant standing.
--
-- The observable consequence was C-33 failing in the database rather than in
-- the contract: an anonymous caller could select from public.admins and
-- public.admin_audit_log. RLS still hid the rows, so nothing leaked, but the
-- roster was one missing policy away from being readable by every visitor.
--
-- A blanket revoke first, then one door at a time below, is the only way to
-- make "no grant" actually mean no grant.
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- Public read: what the storefront renders.
grant select on
  public.games,
  public.products,
  public.product_images,
  public.store_settings,
  public.site_sections
to anon, authenticated;

-- Admin write. Note the asymmetry: games, products and product_images can be
-- deleted; store_settings and site_sections cannot (C-4).
grant insert, update, delete on
  public.games,
  public.products,
  public.product_images
to authenticated;

grant insert, update on
  public.store_settings,
  public.site_sections
to authenticated;

-- Profiles: own row.
grant select, update on public.profiles to authenticated;

-- admin_audit_log: INSERT only. Even an administrator has no SELECT here
-- (C-33) — the dashboard reads admin_dashboard_stats_gate() instead.
grant insert on public.admin_audit_log to authenticated;

-- C-33: NO grant on public.admins at all. The roster is not readable by any
-- client, administrator or not; is_admin() answers the only question the
-- application asks.
--
-- C-33 also rules out `grant all on all sequences`. Sequences are granted
-- individually, and only where the client genuinely inserts: the identity
-- column on admin_audit_log, which write_audit() feeds.
grant usage, select on sequence public.admin_audit_log_id_seq to authenticated;

-- ===========================================================================
-- Function privileges
--
-- CREATE FUNCTION grants EXECUTE to PUBLIC by default, so every function is
-- revoked first. A validation helper that anonymous callers can execute is a
-- function that anonymous callers can use to probe stored values.
-- ===========================================================================
revoke execute on function public.is_safe_link(text)               from public;
revoke execute on function public.is_safe_social(text)             from public;
revoke execute on function public.is_media_path(text)              from public;
revoke execute on function public.is_media_path_for_bucket(text, text) from public;

revoke execute on function public.is_admin()                       from public;
revoke execute on function public.search_products(text, text, public.product_status, public.product_currency, bigint, bigint, text, int, int) from public;
revoke execute on function public.get_product_detail(text)        from public;
revoke execute on function public.get_site_shell()                 from public;
revoke execute on function public.game_catalog_cards()             from public;
revoke execute on function public.admin_dashboard_stats_gate()     from public;
revoke execute on function public.grant_admin(uuid)                from public;
revoke execute on function public.revoke_admin(uuid)               from public;
revoke execute on function public.write_audit(text, text, text, jsonb) from public;
revoke execute on function public.append_product_images(uuid, jsonb)   from public;
revoke execute on function public.set_product_cover(uuid, uuid)        from public;

-- Private: the default PUBLIC execute grant has to go explicitly, because
-- F-07 depends on it.
revoke execute on function private.is_admin_internal(uuid)             from public;
revoke execute on function private.grant_admin_internal(uuid)          from public;
revoke execute on function private.revoke_admin_internal(uuid)         from public;
revoke execute on function private.write_audit_internal(text, text, text, jsonb) from public;
revoke execute on function private.append_product_images_internal(uuid, jsonb)   from public;
revoke execute on function private.set_product_cover_internal(uuid, uuid)        from public;
revoke execute on function private.set_updated_at()                    from public;
revoke execute on function private.products_search_text()              from public;
revoke execute on function private.games_refresh_search_text()         from public;
revoke execute on function private.products_featured_at()              from public;
revoke execute on function private.deny_delete()                       from public;
revoke execute on function private.handle_new_user()                   from public;

-- ===========================================================================
-- Public reads — callable by anonymous visitors
-- ===========================================================================
grant execute on function public.is_admin()             to anon, authenticated;
grant execute on function public.get_site_shell()       to anon, authenticated;
grant execute on function public.game_catalog_cards()   to anon, authenticated;
grant execute on function public.search_products(text, text, public.product_status, public.product_currency, bigint, bigint, text, int, int)
  to anon, authenticated;
grant execute on function public.get_product_detail(text) to anon, authenticated;

-- ===========================================================================
-- Admin only
--
-- The guard on each of these is the is_admin() check inside the private
-- implementation, not the GRANT. A grant controls who may attempt the call;
-- only the function decides whether it succeeds.
-- ===========================================================================
grant execute on function public.admin_dashboard_stats_gate()  to authenticated;
grant execute on function public.grant_admin(uuid)             to authenticated;
grant execute on function public.revoke_admin(uuid)            to authenticated;
grant execute on function public.write_audit(text, text, text, jsonb) to authenticated;
grant execute on function public.append_product_images(uuid, jsonb)   to authenticated;
grant execute on function public.set_product_cover(uuid, uuid)        to authenticated;

-- handle_new_user, set_updated_at, deny_delete and the search-text helpers
-- are trigger functions. They are invoked by a trigger, never called, so
-- they receive no grant.

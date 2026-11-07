-- 02_enums.sql
-- The three value domains. Kept in their own file because search_products
-- declares its parameters with these types (C-17): passing a `text` where a
-- `product_currency` is expected fails at CREATE FUNCTION time with
-- "operator does not exist", which is the exact error this split avoids.
--
-- Idempotent: DO block, safe to re-run.

do $$ begin
  create type public.product_currency as enum ('THB', 'LAK');
exception when duplicate_object then
  raise notice 'product_currency มีอยู่แล้ว';
end $$;

do $$ begin
  create type public.product_status as enum ('available', 'reserved', 'sold');
exception when duplicate_object then
  raise notice 'product_status มีอยู่แล้ว';
end $$;

alter type public.product_status add value if not exists 'reserved';

do $$ begin
  create type public.product_binding as enum ('bound', 'unbound');
exception when duplicate_object then
  raise notice 'product_binding มีอยู่แล้ว';
end $$;

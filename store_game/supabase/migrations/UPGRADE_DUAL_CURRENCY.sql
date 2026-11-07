-- ===========================================================================
-- UPGRADE_DUAL_CURRENCY.sql
-- สคริปต์อัปเกรดฐานข้อมูล Supabase สำหรับระบบ 2 สกุลเงิน (THB & LAK) และสถานะ Reserved
-- สามารถคัดลอกไปวางใน Supabase Dashboard -> SQL Editor แล้วกด Run ได้ทันที (รันซ้ำได้ปลอดภัย)
-- ===========================================================================

-- 1. เพิ่มสถานะ 'reserved' (ติดจอง) ใน enum public.product_status
alter type public.product_status add value if not exists 'reserved';

-- 2. เพิ่มคอลัมน์ price_thb และ price_lak ในตาราง public.products
alter table public.products
  add column if not exists price_thb bigint,
  add column if not exists price_lak bigint;

do $$ begin
  alter table public.products
    add constraint products_price_thb_nonneg check (price_thb is null or price_thb >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.products
    add constraint products_price_lak_nonneg check (price_lak is null or price_lak >= 0);
exception when duplicate_object then null; end $$;

-- 3. ซิงก์ข้อมูลราคาเดิมเข้าสู่ price_thb / price_lak สำหรับสินค้าที่มีอยู่แล้ว
update public.products
set
  price_thb = coalesce(price_thb, case when currency = 'THB' then price_amount end),
  price_lak = coalesce(price_lak, case when currency = 'LAK' then price_amount end)
where price_thb is null and price_lak is null;

-- 4. อัปเดตฟังก์ชัน public.search_products ให้รองรับการค้นหา กรองราคา และเรียงลำดับแยกตามสกุลเงิน (THB / LAK)
create or replace function public.search_products(
  p_pattern    text                      default null,
  p_game_slug  text                      default null,
  p_status     public.product_status     default null,
  p_currency   public.product_currency   default 'THB',
  p_min        bigint                    default null,
  p_max        bigint                    default null,
  p_sort       text                      default 'newest',
  p_limit      int                       default 24,
  p_offset     int                       default 0
)
returns table (items public.products[], total bigint)
language sql
stable
security invoker
set search_path = public
as $$
  with priced as (
    select
      p as product_row,
      p.created_at,
      p.product_code,
      case
        when p_currency = 'THB' then coalesce(p.price_thb, case when p.currency = 'THB' then p.price_amount end)
        when p_currency = 'LAK' then coalesce(p.price_lak, case when p.currency = 'LAK' then p.price_amount end)
        else p.price_amount
      end as effective_price
    from public.products p
    join public.games g on g.id = p.game_id
    where p.is_visible
      and g.is_enabled
      and (p_status is null or p.status = p_status)
      and (p_game_slug is null or g.slug = p_game_slug)
      and (
        p_pattern is null
        or p.search_text ilike ('%' || p_pattern || '%') escape '!'
      )
  ),
  filtered as (
    select pr.*
    from priced pr
    where pr.effective_price is not null
      and (p_min is null or pr.effective_price >= p_min)
      and (p_max is null or pr.effective_price <= p_max)
  ),
  paged as (
    select f.product_row
    from filtered f
    order by
      case when p_sort = 'price_asc'  then f.effective_price end asc nulls last,
      case when p_sort = 'price_desc' then f.effective_price end desc nulls last,
      case when p_sort = 'oldest'     then f.created_at      end asc nulls last,
      f.created_at desc,
      f.product_code asc
    limit least(greatest(coalesce(p_limit, 24), 1), 100)
    offset greatest(coalesce(p_offset, 0), 0)
  )
  select
    coalesce((select array_agg(pg.product_row) from paged pg), '{}'::public.products[]),
    (select count(*) from filtered);
$$;

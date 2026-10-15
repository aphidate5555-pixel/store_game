# migrations

## วิธี apply

**วิธีหลัก — SQL Editor** (ไม่ต้องมี service_role key)

1. Supabase Dashboard → project `vwoxglwkjzktuekjnfsj` → **SQL Editor** → **New query**
2. paste ไฟล์ `00_verify_preflight.sql` ทั้งไฟล์ → **Run** → ต้องขึ้น `Success`
3. ทำซ้ำทีละไฟล์ `01` → `16` **ตามลำดับ**
4. `99_seed_demo.sql` เฉพาะตอน dev — ห้ามรันบน production

> SQL Editor รันทั้งไฟล์ใน transaction เดียว error ตรงไหนไฟล์นั้น rollback ทั้งก้อน
> ไม่เหลือสภาพครึ่ง ๆ

**ทางเลือก — CLI**

```bash
npx supabase@latest init
npx supabase@latest link --project-ref vwoxglwkjzktuekjnfsj
npx supabase@latest db push
```

## ทำไมต้องเรียงตามลำดับ

| ไฟล์ | ต้องมาก่อน / หลัง | เหตุผล |
|---|---|---|
| `00` preflight | ทุกไฟล์ | สร้าง extension และ schema `private` |
| `01` helpers | `08` `09` `15` | `is_media_path` ถูกอ้างเป็น CHECK constraint |
| `02` enums | `06` `12` | `products.currency` และ `search_products` ใช้ชนิด enum |
| `03` `04` | `05` `06` | FK อ้าง `auth.users` |
| `05` games | `06` | FK อ้าง games |
| `06` products | `07` | FK อ้าง products |
| `08` `09` | `12` | `get_site_shell` อ่านสองตารางนี้ |
| `11` triggers | `12` | trigger อ้างฟังก์ชันใน `private` |
| `12` functions | `13` `14` | **RLS policies เรียก `is_admin()`** |
| `13` RLS | `14` `15` | storage policies เรียก `is_admin()` |
| `14` grants | `15` | grant `usage` schema ต้องมาก่อน |
| `15` storage | `16` | — |
| `16` guards | — | revoke ต้องเป็นขั้นสุดท้าย |

## Idempotency

ทุกไฟล์รันซ้ำได้โดยไม่พัง:

- `create table if not exists` / `create schema if not exists`
- `create or replace function`
- `drop policy if exists` / `drop trigger if exists` ก่อน `create`
- `do $$ … exception when duplicate_object … $$` กัน enum ซ้ำ
- seed ใช้ `on conflict do nothing`

## First-admin bootstrap (ไม่มี service_role)

ต้องทำหลังรัน `00`–`16` เสร็จ

**ขั้นที่ 1** — Dashboard → **Authentication** → **Users** → **Add user**
กรอกอีเมล/รหัสผ่าน → ติ๊ก **Auto Confirm User** → Save

**ขั้นที่ 2** — SQL Editor → paste

```sql
insert into public.admins (user_id, granted_at)
select id, now() from auth.users where email = 'owner@yourstore.com'
on conflict (user_id) do nothing;

select u.email, a.granted_at, a.revoked_at
from public.admins a join auth.users u on u.id = a.user_id;
```

> ต้องเป็น SQL Editor เท่านั้น เพราะตอนนี้ยังไม่มีใครเป็น admin
> `grant_admin()` จะปฏิเสธการเรียกจากผู้ที่ยังไม่มีสิทธิ์

**ขั้นที่ 3** — ล็อกอินที่ `/admin/login` → เข้าหน้าแอดมินได้

หลังจากนี้การเปลี่ยนสิทธิ์ทุกครั้งผ่าน `grant_admin(uuid)` / `revoke_admin(uuid)`
ซึ่ง **throw เมื่อไม่พบผู้ใช้** — ไม่ใช่รายงานสำเร็จเงียบ ๆ (C-10)

## ปิด email sign-up

Supabase Dashboard → **Authentication** → **Sign In / Providers** → **Email**
→ ปิด **Allow new users to sign up**

ทำ**ก่อน** grant ใด ๆ ถ้าเปิดไว้ ผู้เข้าชมทั่วไปสร้าง `authenticated` JWT ได้เอง
แล้วเข้าถึงทุก grant ของ `authenticated` ทันที

## ตรวจว่าสำเร็จ

```sql
select 'tables' as item,
       count(*) filter (where ok) as good,
       count(*) filter (where not ok) as bad
from (select relname, relrowsecurity as ok
      from pg_class
      where relnamespace = 'public'::regnamespace and relkind = 'r') t
union all
select 'functions', count(*), 0
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('is_admin','get_site_shell','search_products','get_product_detail',
                    'game_catalog_cards','admin_dashboard_stats_gate')
union all
select 'buckets', count(*), 0
from storage.buckets where id in ('product-media','brand-assets');
```

**คาดหวัง `tables 8 / 0` · `functions 6 / 0` · `buckets 2 / 0`**

`bad > 0` แปลว่ามีตารางที่ลืม `enable row level security` — **หยุดแก้ก่อน deploy**

## guard tests

`private.schema_tables()` / `schema_columns()` / `tables_missing_rls()` เข้าถึงได้
จาก **direct connection เท่านั้น** (F-06) ไม่ใช่ Data API

```bash
psql "$SUPABASE_CI_DB_URL" -c "select * from private.tables_missing_rls();"
```

ต้องคืน 0 แถว

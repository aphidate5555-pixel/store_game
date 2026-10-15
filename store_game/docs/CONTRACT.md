# CONTRACT.md — ข้อตกลงที่ผ่านการ reconcile แล้ว (อ่านก่อนเขียนโค้ดทุกไฟล์)

เอกสารนี้คือ **ผลลัพธ์** ของการรวม FINAL CONTRACT OVERRIDES (F-01…F-17) เข้าไปในสัญญาเดิมทั้ง 44 ข้อ
มี **เส้นทาง implementation เดียว** เท่านั้น · ห้ามเสนอทางเลือก · ห้ามเขียนโค้ดสองแบบเพื่อรองรับทั้งสองกรณี

> ภาษาไทยคือภาษาของหน้าเว็บทั้งหมด · โค้ด ตัวระบุ เส้นทาง และ DDL เป็นภาษาอังกฤษ

---

## 1. เวอร์ชันที่ pin ไว้ (F-03, F-17)

| แพ็กเกจ | เวอร์ชัน | เหตุผล |
|---|---|---|
| `next` | **15.5.27** | API ที่แผนใช้ (`revalidateTag(t,'max')`, `generateSitemaps`, `params` เป็น Promise, `middleware.ts`) เป็นของ 15.x · Next 16 เปลี่ยนชื่อ middleware และตัด API หลายตัว |
| `react` / `react-dom` | 19.0.0 | คู่ของ Next 15.5 |
| `zod` | 3.24.1 | `z.uuid()` top-level ที่แผนใช้มีใน v4; v3 ใช้ `z.string().uuid()` — โค้ดทุกไฟล์ใช้ v3 API |
| `@supabase/ssr` | 0.5.2 | `createBrowserClient` เก็บ `code_verifier` เป็น cookie (C-25) |
| `tailwindcss` | 4.0.0 | `@theme inline` / `@utility` |
| `typescript` | 5.7.3 | strict |

**ห้าม** รัน `create-next-app@latest` · ห้ามอ้างตัวอย่างที่เขียนสำหรับ Next 16

---

## 2. FINAL DECISIONS — ผลที่ได้หลัง reconcile

### F-01 — `search_products` return contract
```sql
RETURNS TABLE(items public.products[], total bigint)
```
❌ ห้ามใช้ `rows setof public.products`
→ caller อ่าน `data[0].items` และ `data[0].total`

### F-02 — cache ของ public catalog
ห้ามอ้างว่า `.rpc()` ถูก cache "เพราะมี `next.tags`" โดยไม่มี test
→ ใช้ `unstable_cache` + `TAGS` อย่างเดียว และมี `tests/unit/cache-tags.test.ts` พิสูจน์ว่า
  - ทุก read ประกาศ tag จาก `TAGS` เท่านั้น
  - ไม่มี `revalidateTag('...')` / `revalidatePath('...')` นอก `src/lib/cache/tags.ts`
  - มี integration test ที่ยิง read เดิม 2 ครั้งแล้วนับ request ที่ยิงจริง

### F-03 — pin Next แบบ explicit → ดู §1

### F-04 — storage path ไม่มีชื่อ bucket เป็น prefix
ค่าในฐานข้อมูลคือ **path ภายใน bucket**:
```
products/<uuid>/<YYYY-MM>/<16hex>.webp          (1600px)
products/<uuid>/<YYYY-MM>/<16hex>-card.webp    (640px)
brand/<kind>/<YYYY-MM>/<16hex>.png
```
ชื่อ bucket เติมตอนสร้าง URL เท่านั้น → `mediaUrl(bucket, path)` ใน `src/lib/storage/media-url.ts`
เดิมที่เขียน `product-media/products/...` **ผิด** · `is_media_path()` ใน SQL ต้องตรวจรูปแบบไม่มี bucket prefix

### F-05 — ปกสินค้า
`product_images` ที่ `position = 0` คือปก · ไม่มี column `cover_path` · ไม่มี `p.cover_path` ใน TypeScript
→ helper `coverImage(images)` คืนแถวแรกเมื่อ `position === 0`

### F-06 — guard test ใช้ 2 credential แยกกัน
- ตรวจ **anonymous behaviour** → anon key
- ตรวจ **schema drift** → connection string ตรงของ CI (`SUPABASE_CI_DB_URL`) เพราะฟังก์ชัน introspection ถูก revoke จาก `public` แล้ว (C-32)
ห้ามใช้ anon key ทำทั้งสองอย่าง

### F-07 — security definer อยู่ใน private schema
```
private.is_admin_internal()            security definer   ← ตัวจริง
public.is_admin()                      security invoker   ← wrapper ที่ RLS เรียก
private.append_product_images_internal()                  ← ตัวจริง
public.append_product_images(...)     security invoker   ← wrapper
```
`schema_tables` / `schema_columns` / `tables_missing_rls` อยู่ที่ `private` ทั้งหมด และ **ไม่มี public wrapper** เพราะไม่มีใครต้องเรียกผ่าน Data API
→ `public` schema ต้องมี `usage` ให้ `anon`/`authenticated` เท่านั้น · `private` ไม่มี grant ให้ใครเลย

### F-08 — Storage policy idempotent + ไม่เปิด listing
```sql
drop policy if exists ... on storage.objects;   -- ทุกตัว ก่อน create
create policy ... for select using (bucket_id in (...) and owner_id = (select auth.uid()::uuid) or bucket_id in (...));
```
**ห้าม** policy ที่เปิด object listing ทั้ง bucket · public read ใช้เฉพาะ 2 bucket ที่เป็น public

### F-09 — product image read policy ตรวจ 2 ชั้น
```sql
using (
  public.is_admin()
  or exists (
    select 1 from public.products p
    join public.games g on g.id = p.game_id
    where p.id = product_images.product_id
      and p.is_visible and g.is_enabled
  )
)
```
เดิมที่ตรวจแค่ `p.is_visible` **ไม่พอ**

### F-10 — ทุก media path ผ่าน DB CHECK
`product_images.storage_path`, `product_images.full_path`, `games.image_path`,
`store_settings.logo_path/favicon_path/default_og_image_path`
→ constraint เรียก `public.is_media_path(text)` ที่ validate รูปแบบไม่มี bucket prefix

### F-11 — sitemap ไม่มี id ซ้ำ
`generateSitemaps()` คืน `[{id:0}, {id:1}, ...]` โดย id 0 = หน้า static และ id N = สินค้าหน้า N
**ห้าม**มี static URL ปนใน sitemap ของสินค้า · **ห้าม** id ซ้ำ
→ ใช้ `PRODUCT_SITEMAP_SIZE = 5000` · เรียง `product_code` (unique) เพื่อให้ `.range()` ไม่ข้าม/ซ้ำ
→ ระหว่าง maintenance `generateSitemaps` คืน `[]`

### F-12 — X-Robots-Tag
**เลือก metadata robots** ไม่ใช่ header สำหรับหน้า maintenance
→ `(public)/layout.tsx` คืน `<meta name="robots" content="noindex, nofollow">` เมื่อ maintenance
→ `robots.ts` คืน `disallow: '/'`
→ header ที่คงไว้มีเฉพาะ `/api/:path*` (static ใน `next.config.ts`) ซึ่งเป็น implementation จริง
→ acceptance test #7 เปลี่ยนจาก "ต้องมี header" เป็น "ต้องมี `<meta name="robots" content="noindex">`"

### F-13 — navigation ใช้ `routeKey`
registry ที่ `src/lib/validation/route-keys.ts`:
```ts
{ home:'/', products:'/products', games:'/games', contact:'/contact' }
```
- `site_sections.payload.navigation.items[].route` เก็บ **key** ไม่ใช่ href
- hero เก็บ `cta_route` (key)
- **ลบ** `v.nav.href` และ `v.heroCta.url` ออกจาก message keys
- `/admin/*` ไม่มีใน registry · ไม่มีการอ่าน `href` จาก `site_sections` เด็ดขาด

### F-14 — ข้อความ validation ตรงกับ MIME จริง
- รูปสินค้า: **JPG, PNG, WebP, AVIF** (ไม่มี HEIC, ไม่มี ICO)
- บรนด์: **JPG, PNG, WebP** (ไม่มี AVIF เพราะ bucket + ImageResponse ไม่รองรับ)
- ข้อความสร้างจาก `ALLOWED_IMAGE_EXT_LABEL` / `ALLOWED_BRAND_EXT_LABEL` ใน `limits.ts` → drift ไม่ได้
- `v.favicon.type` เดิมบอก "PNG, ICO หรือ WEBP" → แก้เป็น "PNG, JPG หรือ WebP"
- `v.image.type` เดิมบอก "JPG, PNG และ WEBP" → แก้เป็น "JPG, PNG, WebP และ AVIF"

### F-15 — `react cache()` ไม่ใช่ persistent cache
`cache()` = memo ระดับ request เท่านั้น (F-15) · ชั้น persistent คือ `unstable_cache` + tags
→ ห้ามเขียนคอมเมนต์ว่า `cache()` ทำให้ข้อมูลไม่หลุด cache

### F-16 — E2E seed
Production ห้ามมี service_role (เดิม `assert-no-service-key.mjs` ยังไว้)
E2E seed: `scripts/seed-e2e.mjs` ใช้ `SUPABASE_ACCESS_TOKEN` (CI secret) → Management API สร้าง user → `SUPABASE_CI_DB_URL` apply `supabase/seed.e2e.sql` เพื่อ insert แถว `admins`
เอกสารต้องระบุวิธีนี้ชัดเจน

### F-17 — ใช้ official API ของ 15.5.27
- `revalidateTag(tag, 'max')` เสมอ
- `revalidatePath(path)` / `revalidatePath(path, 'layout')`
- `params` / `searchParams` เป็น `Promise` → `await`
- `generateSitemaps` + `export default sitemap({id})`
- middleware ชื่อ `src/middleware.ts` + `export const config.matcher`
- ห้ามทำ compatibility hack หลายแบบ

---

## 3. ข้อตกลง C-1 … C-44 (สรุปสิ่งที่กระทบโค้ด)

| # | ผลที่ต้องเขียนตาม |
|---|---|
| C-1 | DDL เจ้าของเดียวคือ `supabase/migrations/*` · ชนิดทุกส่วนอ่านจาก `Database['public']['Tables']['store_settings']['Row']` · `store_name` · `default_og_image_path` · ไม่มี `whatsapp_link` |
| C-2 | `site_sections(section_key, payload, updated_at)` · ปิดส่วน = `payload.enabled=false` · ไม่มี `order_index` · 7 key |
| C-3 | 2 bucket เท่านั้น จาก `BUCKETS` |
| C-4 | Appearance ส่ง `.sql` = 0 ไฟล์ · RLS drop-then-create · ไม่มี DELETE บน settings/sections · audit = `admin_audit_log` + `write_audit()` |
| C-5 | `requireAdmin()` → `{ok:true} \| {ok:false,reason:'no-session'} \| {ok:false,reason:'not-admin'}` · not-admin render 403 **ไม่ redirect** |
| C-6 | ใช้ `safeInternal` ตัวเดียว + scope `^/admin(?:/\|$)` ที่ callback |
| C-7 | `TAGS` ชุดเดียว + helper 3 ตัว |
| C-8 | `src/app/sitemap.ts` + `src/app/robots.ts` เท่านั้น · ไม่มี route มือ |
| C-9 | `is_visible=false` → noindex,follow · `status='sold'` → index + `OutOfStock` + ลิงก์สินค้าอื่น |
| C-10 | `grant_admin(uuid)` / `revoke_admin(uuid)` **raise เมื่อไม่พบผู้ใช้** |
| C-11 | `whatsapp_number` digits-only · code สร้าง `https://wa.me/<digits>?text=…` |
| C-12 | `formatPrice` ที่ `src/lib/format/money.ts` เท่านั้น |
| C-13 | `EXTERNAL_HOSTS` ใน `src/lib/validation/url.ts` + parity test กับ SQL |
| C-14 | `invalidateProduct(code)` เท่านั้น · ไม่มี bracketed literal |
| C-15 | stem เดียวก่อน loop · 1 แถว/ไฟล์ · `set_product_cover` ครั้งเดียวหลัง loop + เช็ค error |
| C-16 | จอง position ใน RPC `security definer` ที่ `select … for update` |
| C-17 | param เป็น enum โดยตรง |
| C-18 | trigram index บน `search_text` + `escape '!'` |
| C-19 | define ทุกฟังก์ชันใน `12_functions.sql` |
| C-20 | `Widen<T>` recurse |
| C-21 | concept route เดียว · `await params` · `dynamicParams=false` |
| C-22 | คืน total ผ่าน `count(*) over ()` |
| C-23 | `src/` ทั้งโปรเจกต์ · `typedRoutes: false` |
| C-24 | middleware matcher = `['/admin/:path*','/auth/callback']` |
| C-25 | `@supabase/ssr` browser client เก็บ code_verifier เป็น cookie |
| C-26 | `getSiteConfig()` ไม่มี data cache · **fail-closed** |
| C-27 | 20MP |
| C-28 | `src/lib/images/limits.ts` จุดเดียว |
| C-29 | maintenance ครอบ OG/sitemap/robots/manifest |
| C-30 | กลุ่มเดียว `(public)` + `(admin)` |
| C-31 | grant เจ้าของไฟล์เดียว |
| C-32 | revoke introspection จาก `public` · ปิด email sign-up |
| C-33 | ไม่ grant select บน `admins`/`admin_audit_log` |
| C-34 | `ProductGridClient` เก็บ children ล่าสุด |
| C-35 | favicon ที่ `src/app/icon/route.tsx` เท่านั้น |
| C-36 | `version integer` + `.eq('version', expected)` |
| C-37 | `next.config.ts` เจ้าของเดียว |
| C-38 | `revalidateTag(t,'max')` ทุกที่ |
| C-39 | per-key validation + `noindex` เมื่อมี key เสีย · cap 100 |
| C-40 | สลับสกุล = ลาก min/max/page |
| C-41 | แยก `ForBody`(throw) / `ForMeta`(null) |
| C-42 | `react/no-danger: error` + disable จุดเดียว |
| C-43 | ลบ `invalidation-contract.test.ts` |
| C-44 | remotePatterns จาก env + localhost 54321 · E2E แยกจาก hosted |

---

## 4. ไฟล์ที่ห้ามสร้าง (ถูกลบแล้ว)
`lib/safe-url.ts` · `lib/settings/safe-link.ts` · `src/lib/catalog/format.ts` ·
`src/lib/storage/validate-image.ts` · `src/app/(shop)/*` · `src/app/(marketing)/*` ·
`src/app/sitemap.xml/route.ts` · `src/app/sitemap-products/*` · `src/app/sitemap-index.xml/route.ts` ·
`supabase/migrations/0008_settings.sql` · `0009_branding_bucket.sql` · `0009_admin_overrides.sql` ·
`*_search_products.sql` · `settings_audit` ตาราง · `tests/unit/invalidation-contract.test.ts` ·
`tests/unit/is-safe-link.test.ts` · `v.nav.href` · `v.heroCta.url` · `v.whatsapp.url` ·
คีย์ข้อความ `admin.settings.fieldWhatsappLink*`

---

## 5. กติกาคอนเวนชันที่ห้ามละเมิด
1. ไม่มี `dangerouslySetInnerHTML` นอกจาก JSON-LD จุดเดียวที่มี `eslint-disable-next-line react/no-danger`
2. `bigint` ห้ามข้าม RSC boundary → format เป็น string ฝั่ง server ก่อน
3. ค่าสีเข้า `style` ต้องผ่าน `/^#[0-9a-fA-F]{6}$/` ก่อนเสมอ
4. ข้อความทั้งหมดมาจาก `src/lib/i18n/th/**` · ห้ามมี Thai literal ใน component
5. query ที่ผูกคุกกี้ห้าม cache (จะ throw ตอน build และรั่วข้าม user)
6. ทุก Server Action เรียก `requireAdmin()` และ throw ภาษาไทยเมื่อไม่มีสิทธิ์
7. ทุก write path เรียก helper จาก `src/lib/cache/tags.ts`

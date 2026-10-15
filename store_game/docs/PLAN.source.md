# แผนพัฒนา — เว็บไอดีเกมพร้อมเล่น (store_game) — ต้นฉบับ

> เอกสารนี้คือแผน implementation ฉบับรวม จาก 7 ส่วนย่อย (ฐานข้อมูล · ดีไซน์ซิสเทม · หน้าลูกค้า · ระบบ Appearance · แอดมิน · ภาษาไทย · ทดสอบและ Deploy) โดย **2 ชุด cross-cutting sweep ชนะเหนือส่วนย่อยเสมอ**
>
> ภาษาไทยเป็นภาษาของเอกสารและของหน้าเว็บทั้งหมด · โค้ด ตัวระบุ เส้นทาง และ DDL เป็นภาษาอังกฤษ

ไฟล์นี้คือสำเนาต้นฉบับที่ผู้ใช้ส่งมา เพื่อให้ agent ทุกตัวอ่านของชุดเดียวกัน ส่วนเอกสารส่งมอบจริงคือ `docs/PLAN.final.md`

---

## 0.3 FINAL CONTRACT OVERRIDES — มีผลเหนือข้อความเก่าทุกส่วน (อ่านหัวข้อนี้ก่อนส่วนอื่นทั้งหมด)

กฎในหัวข้อนี้มี priority สูงสุดเหนือข้อความใด ๆ ในเอกสาร
หากข้อความเก่าขัดกับหัวข้อนี้ ให้ถือว่าข้อความเก่าถูกยกเลิก
ห้ามถามผู้ใช้เพื่อเลือกเอง และห้ามสร้าง implementation สองแบบเพื่อรองรับทั้งสองกรณี

### FINAL DECISIONS

**F-01** Database function `search_products()` ต้องใช้ return contract เดียว: `RETURNS TABLE(items public.products[], total bigint)` · ห้ามใช้ `rows setof public.products`

**F-02** ระบบ cache ของ public catalog ต้องใช้ Next.js cache API ที่ตรงกับ version ที่ pin ไว้ของโปรเจกต์ · ห้ามอ้างว่า Supabase `.rpc()` ถูก cache เพียงเพราะมี `next.tags` โดยไม่มี automated test พิสูจน์

**F-03** โปรเจกต์ pin Next.js version แบบ explicit · ห้ามใช้ `create-next-app@latest` เป็น dependency contract ระหว่าง implementation

**F-04** Storage path ใน database เป็น path ภายใน bucket เท่านั้น · ห้ามใส่ชื่อ bucket ซ้ำเป็น prefix ของ object path

**F-05** Product cover ใช้ `product_images.position = 0` เป็น source of truth · ห้ามมี `p.cover_path` ถ้าไม่มี column จริงใน schema · ห้ามมี cover state ซ้ำสองแห่งโดยไม่จำเป็น

**F-06** Database guard test ห้ามใช้ anonymous key เป็นทั้ง anonymous user และ privileged schema-inspection role

**F-07** Security-definer helper อยู่ใน private schema · ส่วนที่ต้องเรียกผ่าน Data API ใช้ public invoker wrapper เท่าที่จำเป็น

**F-08** ทุก Storage policy ต้อง idempotent ใช้ `drop policy if exists` ก่อน `create policy` และห้ามเปิด public object listing โดยไม่จำเป็น

**F-09** Product image public-read policy ต้องตรวจทั้ง `product.is_visible` และ `game.is_enabled`

**F-10** ทุก media path ต้องผ่าน database CHECK ที่ตรวจ bucket/path format ไม่ใช่ตรวจเฉพาะใน TypeScript

**F-11** Sitemap ต้องตรงกับ API ของ Next.js version ที่ pin ไว้ · ห้ามมี duplicate sitemap id · ห้ามมี static URL ซ้ำหลาย sitemap โดยไม่ตั้งใจ

**F-12** Requirement `X-Robots-Tag` ต้องมี implementation จริง หรือถูกเปลี่ยนเป็น metadata robots/noindex อย่างชัดเจน · ห้ามระบุใน acceptance test ว่าต้องมี header หาก code ไม่มีวิธีสร้าง header

**F-13** Navigation ใช้ `routeKey` เป็น source of truth ไม่ใช้ `href` ที่ admin พิมพ์เองสำหรับ internal route

**F-14** ทุกข้อความ validation ต้องตรงกับ MIME/type ที่ระบบรองรับจริง

**F-15** ห้ามถือว่า `react cache()` คือ persistent application cache มันใช้เพื่อ request-level memoization เท่านั้น

**F-16** Production application ห้ามมี service_role key แต่ E2E infrastructure ต้องระบุอย่างชัดเจนว่าจะ seed test user/data ด้วยวิธีใด

**F-17** หาก official framework API ของ version ที่ pin ไว้แตกต่างจากตัวอย่างในเอกสาร ให้ใช้ official API ของ version นั้น และแก้เอกสาร/ตัวทดสอบให้ตรง · ห้ามทำ compatibility hack หลายแบบโดยไม่มีเหตุผล

---

## 0.1 ตารางข้อขัดแย้งที่ตัดสินแล้ว (บังคับทั้งโปรเจกต์)

| # | ข้อขัดแย้ง | คำตัดสิน |
|---|---|---|
| **C-1** | DDL ของ `store_settings` สามชุด ขัดกันทุกคอลัมน์ | **ส่วนที่ 5 เป็นเจ้าของ DDL/RLS/GRANT/STORAGE ทั้งหมด** ส่วนที่ 8 ส่ง `.sql` = 0 ไฟล์ · เลือก `store_name` · ชื่อ OG = `default_og_image_path` · ตัด `whatsapp_link` · เพิ่ม `seo_title`/`seo_description`/`default_currency` |
| **C-2** | `site_sections` สามรูปแบบ | **`site_sections(section_key text PK, payload jsonb, updated_at)`** เท่านั้น · ยุบ `visible` เป็น `payload.enabled=false` · ไม่มี `order_index` · key 7 ตัว |
| **C-3** | Storage 3 ชุด | **2 bucket เท่านั้น `product-media`, `brand-assets`** · `src/lib/storage/buckets.ts` export `BUCKETS` |
| **C-4** | SQL ของ Appearance ทำลาการักษาความปลอดภัยในฐานข้อมูล | **Appearance ส่งเฉพาะ TypeScript** · `13_rls.sql` เจ้าของทุก policy drop-then-create ใช้ `is_admin()` จุดเดียว · ไม่มี DELETE บน settings/sections · ใช้ `admin_audit_log` + `write_audit()` ตัวเดียว |
| **C-5** | ไม่ล็อกอิน vs ล็อกอินแล้วไม่ใช่แอดมิน | `requireAdmin()` คืน discriminated result: `no-session` → redirect `/admin/login?next=`+validated; `not-admin` → render 403 **ไม่ redirect เด็ดขาด** |
| **C-6** | Open redirect สองทาง | ใช้ character allowlist ของส่วนที่ 6 เป็น implementation เดียว บวก scope `^/admin(?:/\|$)` ที่ callback |
| **C-7** | Cache tag 4 ชุดไม่ทับกัน | **`src/lib/cache/tags.ts` มี `TAGS` ชุดเดียว** · helper `invalidateCatalog()`/`invalidateSiteConfig()` · ลบ `site-config`,`site-shell` |
| **C-8** | sitemap สองเจ้าของ/สองกลไก | **ส่วนที่ 11 เป็นเจ้าของ `src/app/sitemap.ts` + `src/app/robots.ts` ไฟล์เดียว** ใช้ `generateSitemaps` ของ file convention · ลบ route มือทั้งหมด |
| **C-9** | สินค้าขายแล้ว: index vs noindex | `is_visible=false` → `noindex, follow`; `status='sold'` → **ยัง index** + JSON-LD `OutOfStock` + ลิงก์สินค้าอื่นในเกมเดียวกัน |
| **C-10** | `grant_admin`/`revoke_admin` รับ email vs uuid | RPC รับ **`uuid`** และ **raise exception เมื่อไม่พบผู้ใช้** · action surface เป็น save ล้มเหลว |
| **C-11** | `whatsapp_link` vs เลขอย่างเดียว | **digits-only** · ลบคอลัมน์/ข้อความ/validator ที่เกี่ยวกับ link · code สร้าง `https://wa.me/<digits>?text=…` เอง |
| **C-12** | `formatPrice` สองแบบ | **`src/lib/format/money.ts` เจ้าของเดียว** · ตรึง locale `th-TH-u-nu-latn-ca-gregory` · ลบ `catalog/format.ts` |
| **C-13** | 5 URL allowlist ไม่เท่ากัน | **`EXTERNAL_HOSTS` ชุดเดียวใน `src/lib/validation/url.ts`** · `wa.me/<8-15 digits>` ผ่าน · มี Vitest เทียบ host set กับ SQL |
| **C-14** | `revalidatePath('/products/[code]')` ตายตัว | helper `invalidateProduct(code)` ทำ `revalidateTag(TAGS.product(code),'max')` + `revalidatePath('/products/'+code)` |
| **C-15** | `product_images` สามรูป | สร้าง **stem เดียวก่อน loop** · หนึ่งแถวต่อไฟล์ `storage_path`(card)+`full_path`(1600px) NOT NULL · ไม่มี array column · `set_product_cover` ครั้งเดียวหลัง loop + เช็ค error |
| **C-16** | `position` ชนกันสองผู้ดูแล | จอง `position` ใน RPC `security definer` ที่ล็อกแถว product (`select … for update`) + `unique (product_id, position)` |
| **C-17** | `search_products` เทียบ enum ด้วย text | ประกาศ param เป็น enum โดยตรง (`p_currency product_currency`, `p_status product_status`) |
| **C-18** | trigram index อยู่บน `products.name` | index บน `search_text` + match `p.search_text ilike … escape '!'` · ลบ `products_name_trgm` |
| **C-19** | RPC ที่แอปเรียกแต่ไม่ถูก define/grant | **define ทุกตัวใน `12_functions.sql` grant ทุกตัวใน `14_grants.sql`** |
| **C-20** | `Widen<T>` map nested object → `string` | recurse: `T[K] extends fn ? fn : T[K] extends object ? Widen<T[K]> : string` |
| **C-21** | concept route สองที่ | **route เดียว** `src/app/(public)/concept/[variant]/page.tsx` · `await params` · คง `generateStaticParams` + `dynamicParams=false` |
| **C-22** | `search_products` ไม่คืน total | คืน total ด้วย `count(*) over ()` และอ่าน total เฉพาะ `page = 1` |
| **C-23** | `src/` vs bare root + `typedRoutes` | **`src/` ทั้งโปรเจกต์** · **`typedRoutes: false`** |
| **C-24** | ไม่มี middleware vs middleware catch-all | **middleware matcher แคบ**: `/admin/:path*` + `/auth/callback` เท่านั้น |
| **C-25** | PKCE callback ล้มเสมอ | ใช้ `@supabase/ssr` `createBrowserClient` เก็บ `code_verifier` เป็น cookie · เพิ่ม e2e ยิง `/auth/callback` จริง |
| **C-26** | maintenance gate สามแบบ + fail-open | **`getSiteConfig()` ตัวเดียว ไม่มี data cache** เรียก `get_site_shell()` · gate ที่ layout กลุ่มเดียว · **fail-closed** |
| **C-27** | `loadInputPixels` 40MP | ลดเหลือ **20MP** · resize variant แรกก่อนจอง variant สอง · คง `failOn:'error'` |
| **C-28** | เกณฑ์อัปโหลดสามชุด | **`src/lib/images/limits.ts` จุดเดียว**: MAX_IMAGE_BYTES=3_500_000, ALLOWED MIME jpeg/png/webp/avif, MAX_FILES=5, MAX_PIXELS=20_000_000 · ไม่มี HEIC · `bodySizeLimit='20mb'` · ลบ `lib/storage/validate-image.ts` |
| **C-29** | maintenance ไม่ครอบ OG/manifest/sitemap | OG route คืนภาพ generic/503 · `sitemap.ts` คืน `[]` · `robots.ts` emit `Disallow: /` · noindex บน MaintenanceScreen |
| **C-30** | route group หลายแบบ | **กลุ่มลูกค้า `(public)` เดียว** · **กลุ่มแอดมิน `(admin)` เดียว** ครอบทุก `/admin/*` |
| **C-31** | grant ซ้ำซ้อนหลายไฟล์ | `14_grants.sql` เป็นเจ้าของ grant ทุกบรรทัด |
| **C-32** | schema introspection เปิดกับ public | revoke ทั้งสามจาก `public` · grant ให้ CI role เท่านั้น · **ปิด email sign-up** |
| **C-33** | grant select เปิด roster | **ตัด grant select บน `admins`/`admin_audit_log`** · เสิร์ผ่าน RPC gate เท่านั้น · ไม่ blanket sequence grant |
| **C-34** | เก็บผลลัพธ์เดิมเมื่อ filter ล้ม | `ProductGrid` เป็น **client leaf** ที่มี error boundary เก็บ children ล่าสุดไว้ · `useTransition` + `router.replace` |
| **C-35** | favicon สองแหล่ง | **favicon แหล่งเดียว**: `src/app/icon/route.tsx` (dynamic, revalidateTag) · ลบ `icons` ออกจาก root metadata |
| **C-36** | optimistic concurrency บน `updated_at` | เพิ่ม `version integer NOT NULL DEFAULT 0` + `.eq('version', expectedVersion)` |
| **C-37** | `next.config.ts` สองเจ้าของ | **ส่วนที่ 11 เป็นเจ้าของทั้งไฟล์** · CSP เพิ่ม `frame-src 'self'`, `worker-src 'self' blob:` |
| **C-38** | `revalidateTag` 1-arg vs 2-arg | **2-arg ทุกที่** |
| **C-39** | `parseCatalogSearchParams` ทิ้งทั้งชุด | validate per-key · มี key เสียหนึ่ง key เป็น `noindex,follow` · `p_limit` cap 100 · `page*limit <= 10000` |
| **C-40** | `CurrencySwitch` คง min/max/page | สลับสกุล = ลาก `min`,`max`,`page` ออกเสมอ |
| **C-41** | `getProductDetail` กลืน error → mass 404 | แยก `getProductDetailForBody` (throw) กับ `getProductDetailForMeta` (คืน null) |
| **C-42** | `react/no-danger: error` vs JSON-LD | คง rule + `eslint-disable-next-line` scoped จุดเดียว + unit test ยืนยัน `ldJson()` escape |
| **C-43** | `invalidation-contract.test.ts` บังคับเกินจริง | **ลบ test นั้น** แทนที่ด้วย unit test ยิง action จริงด้วย session ผู้ใช้ทั่วไป → error ไทย |
| **C-44** | E2E remotePatterns ทำให้ `next/image` throw | remotePatterns ขับ hostname จาก env + localhost 54321 · E2E รันบน Supabase แยกที่ควบคุมเอง |

### 0.2 สิ่งที่ทั้งสอง sweep ไม่ได้พูดถึง แต่ต้องตัดสิน

- **root layout + แบรนด์สี**: สีอยู่ใน `<html style>` → `export const dynamic = 'force-dynamic'` ที่ root แล้ว HTML ฝั่ง public ไม่ถูก cache · ข้อมูล catalog ยัง cache ที่ fetch layer · ลดต้นทุนด้วย RPC เดียว `get_site_shell` 1 round trip
- **`useUnsavedChangesGuard`**: ต้องมี capture-phase `click` บน `a[href]`, patch `history.pushState/replaceState/popstate`, คืนฟังก์ชันเดิมตอน unmount
- **Route registry**: เมนูแอดมินเลือก `routeKey` จาก registry เป็น dropdown · `routeKey` เป็น source of truth ของการนำทางภายในทั้งโปรเจกต์ · ไม่มีการอ่าน `href` จาก `site_sections` เด็ดขาด
- **`next` param ของ login**: ต้อง match `^/admin(?:/|$)` เท่านั้น ไม่ผ่าน = ทิ้งค่าไป `/admin`
- **`favicon` cache**: ย้อนระบุให้แอดมินว่าเบราว์เซอร์อาจแสดงไอคอนเดิมอยู่หลายนาที

---

## 1. บริบท

`store_game` คือเว็บแคตตาล็อกขายไอดีเกมออนไลน์ สำหรับร้านหนึ่งร้านในประเทศไทย หน้าเว็บสาธารณะเป็นภาษาไทยทั้งหมด โทนมืดแบบ modern gaming catalog (ดำ/ถ่าน เน้นการ์ดสินค้า คอนทราสต์สูง แอนิเมชันน้อย) โปรเจกต์เป็น **greenfield** — ไดเรกทอรีว่าง — สร้างใหม่ทั้งหมดบน Next.js App Router + TypeScript strict + Tailwind v4 + Supabase จุดต่อกับลูกค้าคือ WhatsApp เท่านั้น (คัดลอกรหัสสินค้า → เปิด WhatsApp → ลูกค้าวางรหัสเอง) เว็บไซต์ **ไม่** ส่งข้อความให้อัตโนมัติ ผู้ดูแลร้านทำทุกอย่างผ่านแอดมินที่ต้องล็อกอิน Supabase Auth และป้องกันด้วย RLS เป็นชั้นบังคับจริง ส่วน Supabase project มีอยู่แล้วและ **ว่างเปล่า** จึงต้องมีขั้นตอน bootstrap แอดมินคนแรกที่ทำได้โดยไม่มี `service_role` key

สามหน้าแนวคิดหน้าแรก (`/concept/a|b|c`) ต้องเป็น **route ที่รันได้จริง** ทั้งสามตัวบนฐานข้อมูลและ business logic ชุดเดียวกัน ใช้ API แบบ `variant` prop — ห้าม fork logic — ส่วน UI ที่ ship จริงคือ Concept A + บางส่วนที่เลือกจาก Concept B

---

## 2. สถาปัตยกรรมรวม

flow: public browser → `src/app/(public)/layout.tsx` → `getSiteConfig()` (fail-closed) → `<html style="--color-primary:…">` → pages → `getPublicDb()` (anon) → Supabase RPC (search_products, get_product_detail, game_catalog_cards, get_site_shell, admin_dashboard_stats_gate, is_admin) + RLS + Storage 2 bucket
admin browser → `src/app/(admin)/admin/**` → `(admin)/layout.tsx` → `requireAdmin()` (no-session → redirect login, not-admin → render 403) → Server Actions → Zod → UPDATE (partial + version) → write_audit() → invalidateCatalog()/SiteConfig() · อัปโหลดรูป: File → sharp → 2 variant → storage upload → 1 row/ไฟล์ · middleware refresh session เฉพาะ `/admin/*`

### 2.2 การตัดสินสถาปัตยกรรมที่สำคัญจริง ๆ

1) **RPC เป็นเจ้าของ query ทุกตัว ไม่ใช่ PostgREST select ตรง ๆ** — RLS เป็นชั้นเดียวกันทั้งทางอ่านและเขียน · ตัวกรอง `is_visible` + `games.is_enabled` อยู่ข้างใน function เสมอ · `limit` cap ใน DB
2) **Supabase client สองตัว แยกเด็ดขาด** — `getPublicDb()` (anon, ไม่มี JWT ของผู้ใช้) ใช้กับข้อมูลสาธารณะ · `createServerClient()` (ผูก cookie) ใช้กับ auth + admin เท่านั้น · **ห้าม cache query ที่ผูกคุกกี้เด็ดขาด**
3) **Cache tag ชุดเดียว + invalidation ผ่าน helper** — `TAGS` หนึ่งไฟล์ + 3 helper = ลบคลาสของบั๊ก "บันทึกแล้วเว็บยังโชว์ค่าเก่า"
4) **Maintenance gate อยู่ที่ layout กลุ่มเดียว ฝั่ง server แบบ fail-closed**

---

## 3. สิ่งที่ต้องทำก่อนเริ่มเขียนโค้ด

### 3.1 ตั้งโปรเจกต์และ env (ต้นฉบับใช้ `npx create-next-app@latest` — **ยกเลิกตาม F-03**)

`.env.example` (public config อย่างเดียว — ห้าม commit secret):
```
NEXT_PUBLIC_SUPABASE_URL=https://vwoxglwkjzktuekjnfsj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_GX7hOH6n1eioFPNKKXT5rw_J9pODsNS
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_E2E_URL=
SUPABASE_E2E_ANON_KEY=
```

### 3.2 ปิด email sign-up (ทำก่อน grant ใด ๆ)

### 3.3 Migration — `00…16 + 99_seed_demo.sql` paste ใน SQL Editor ตามลำดับ ทุกไฟล์ idempotent

### 3.4 First-admin bootstrap (ไม่มี service_role key)

### 3.5 ตรวจว่า schema สำเร็จ — คาดหวัง `tables 8 / 0`, `functions 6 / 0`, `buckets 2 / 0`

### 3.6 Seed เริ่มต้น (dev เท่านั้น) — 4 หมวด

---

## 4. โครงสร้างไฟล์ทั้งหมด

กฎ: **`src/` ทั้งโปรเจกต์ (C-23)** · กลุ่มลูกค้า `(public)` เดียว · กลุ่มแอดมิน `(admin)` เดียว · component ของ public layout/header/footer รวมเป็น `components/site/`

```
store_game/
├─ .env.example  .env.local  .gitignore  .lighthouserc.json
├─ eslint.config.mjs  next.config.ts  package.json  tsconfig.json
├─ vitest.config.ts  playwright.config.ts  postcss.config.mjs  README.md
├─ .github/workflows/ci.yml
├─ scripts/  check-env.mjs · assert-no-service-key.mjs · smoke-routes.mjs · smoke-images.mjs · seed-e2e.mjs · e2e-build-and-start.mjs
├─ public/
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx · globals.css · fonts.ts · error.tsx · global-error.tsx · not-found.tsx
│  │  ├─ icon/route.tsx · apple-icon/route.tsx · manifest.ts · sitemap.ts · robots.ts
│  │  ├─ api/og/route.tsx · auth/callback/route.ts
│  │  ├─ (public)/  layout.tsx · error.tsx · not-found.tsx · page.tsx · concept/[variant]/page.tsx
│  │  │             games/page.tsx · games/[slug]/page.tsx · products/page.tsx
│  │  │             products/[productCode]/page.tsx · contact/page.tsx
│  │  └─ (admin)/  layout.tsx · forbidden.tsx · admin/{login,page.tsx,products/,categories/,settings/,appearance/}
│  ├─ assets/fonts/NotoSansThai-{Regular,Bold}.ttf
│  ├─ lib/  database.types.ts · cache/tags.ts · env/schema.ts
│  │  ├─ supabase/ types.ts public-client.ts server.ts action.ts keys.ts middleware.ts
│  │  ├─ auth/ require-admin.ts sign-in.ts session.ts
│  │  ├─ images/ limits.ts process-upload.ts
│  │  ├─ storage/ buckets.ts media-url.ts storage-paths.ts branding.ts
│  │  ├─ catalog/ search-params.ts queries.ts site-content.ts whatsapp.ts seo.ts ldjson.ts sitemap-data.ts
│  │  ├─ home/ variants.ts section-order.ts sections.ts
│  │  ├─ settings/ query.ts schema.ts theme.ts brand-css.ts section-store.ts
│  │  ├─ theme/brand-tokens.ts
│  │  ├─ validation/ url.ts product.ts site-sections.ts field-label.ts messages.ts
│  │  ├─ format/ money.ts number.ts date.ts product-status.ts
│  │  └─ i18n/ types.ts index.ts th/{index,defaults,site,whatsapp,states,errors,maintenance,footer,seo}.ts th/admin/*
│  ├─ components/ ui/ site/ catalog/ product/ home/ admin/ settings/
│  └─ hooks/ use-unsaved-changes-guard.ts use-debounced-value.ts use-toast.ts
├─ supabase/ config.toml · seed.e2e.sql · migrations/00…16 + 99_seed_demo.sql + README.md
└─ tests/ guards/ unit/ e2e/
```

**ไฟล์ที่ถูกลบ**: `lib/safe-url.ts` · `lib/settings/safe-link.ts` · `src/lib/catalog/format.ts` · `src/lib/storage/validate-image.ts` · `app/manifest.ts`/`robots.ts` ของ Appearance · `src/app/sitemap.xml|robots.ts` ของหน้าลูกค้า · `src/app/(shop)/*` · `src/app/(marketing)/*` · `0008_settings.sql` · `0009_branding_bucket.sql` · `0009_admin_overrides.sql` · `*_search_products.sql` · `tests/unit/invalidation-contract.test.ts` · `tests/unit/is-safe-link.test.ts`

---

## 5. ส่วนที่ 1 — ฐานข้อมูล · Schema, RLS, Storage

### 5.1 Enum
`product_currency` = THB|LAK · `product_status` = available|sold · `product_binding` = bound|unbound
`01_extensions_and_helpers.sql` — pg_trgm, pgcrypto, EXTERNAL_HOSTS + `is_safe_link`/`is_safe_social`/`is_media_path` เป็น CHECK constraint

### 5.2 `store_settings` (C-1) — 24 คอลัมน์
id, store_name, store_description, logo_path, favicon_path, default_og_image_path, primary_color, accent_color, whatsapp_number, facebook_url, tiktok_url, instagram_url, footer_text, footer_disclaimer, floating_whatsapp_enabled, floating_whatsapp_text, business_hours, maintenance_mode, maintenance_message, seo_title, seo_description, default_currency, version, updated_at
`singleton`: `id boolean primary key default true check (id)` · ทุก read ใช้ `.eq('id', true).maybeSingle()`

### 5.2b `site_sections` (C-2)
`section_key text PK check in 7 keys` · `payload jsonb` · `updated_at`

ตารางอื่น: `admins`, `admin_audit_log`, `profiles`, `games`, `products`, `product_images` (storage_path + full_path, unique(product_id,position), ไม่มี array column)

### 5.3 Index — `products_search_trgm` บน `search_text` (C-18)

### 5.4 Trigger — set_updated_at, products_search_text, products_featured_at, product_images_cover, deny_delete_settings, handle_new_user

### 5.5 Function (C-19, C-31) — `12_functions.sql` define เท่านั้น
`is_admin()`, `search_products(...)`, `get_product_detail(text)`, `get_site_shell()`, `game_catalog_cards()`, `admin_dashboard_stats_gate()`, `grant_admin(uuid)`/`revoke_admin(uuid)` (raise เมื่อไม่พบผู้ใช้), `write_audit(...)`, `set_product_cover(uuid,uuid)`, `append_product_images(uuid,jsonb)`
> **F-01 แทนที่ return contract: `RETURNS TABLE(items public.products[], total bigint)`**

### 5.6 RLS `13_rls.sql` — 8 ตาราง · drop-then-create · ไม่มี DELETE บน settings/sections

### 5.7 Grant `14_grants.sql` — ไฟล์เดียวเป็นเจ้าของ · ไม่ grant select บน admins/admin_audit_log

### 5.8 Storage `15_storage.sql` — 2 bucket · path convention

### 5.9 Guard `16_views_and_guards.sql` — `schema_tables()`, `schema_columns(text)`, `tables_missing_rls()`

### 5.10 อัปโหลดรูป — `process-upload.ts` (2 variant, stem เดียว, validate ก่อน decode) + Server Action ทนทานรายไฟล์

---

## 6. ส่วนที่ 2 — ดีไซน์ซิสเทม

- 6.1 tokens สี (`brand-tokens.ts`, `globals.css` `@theme inline`) — C-12: HEX 6 หลักบังคับ · relative luminance (WCAG 2.x) · `derivePalette` · `ensureContrast` ตรวจกับพื้นแย่ที่สุด
- 6.2 Primitives: button/card/badge/input/select/bottom-sheet/modal/skeleton/toast/tabs + empty/error states
- 6.3 Accessibility: focus ring `outline` ขาว · ขนาดตัวอักษรขั้นต่ำ · กับดักสีแดง/เขียว (ข้อความ+ไอคอน+รูปร่าง) · order button ใช้ `aria-disabled` · `<html lang="th">`
- 6.4 Motion: micro 120–150ms / enter-exit 200ms / reveal 240ms / loop 1.6s (skeleton เท่านั้น) · `prefers-reduced-motion` · `data-js` progressive enhancement
- 6.5 Responsive: grid 2/3/4 · filters sheet/sidebar · tap ≥44px · iOS safe area
- 6.6 3 คอนเซปต์ — route เดียว + `variant` prop
- 6.7 URL allowlist — `EXTERNAL_HOSTS` + `safeInternal`/`safeExternal` (C-13)

---

## 7. ส่วนที่ 3 — หน้าลูกค้า

- 7.1 i18n seam `Widen<T>` (C-20) + `resolveStrings` (DB > dictionary)
- 7.2 Supabase client + cache tag
- 7.3 searchParams — สกุลเงินเป็น facet บังคับ · per-key validation (C-39) · `likePattern` escape
- 7.4 Product grid เก็บผลลัพธ์เดิมเมื่อ filter ล้ม (C-34)
- 7.5 SEO metadata · JSON-LD escape
- 7.6 sitemap/robots (C-8) — `generateSitemaps` + paginate
- 7.7 WhatsApp CTA เปิดแท็บก่อน await
- 7.8 Error boundary สี่ชั้น · `getSiteConfig()` fail-closed

---

## 8. ส่วนที่ 4 — ระบบ Appearance

- 8.1 โครงสร้างข้อมูลที่อ่าน (ไม่สร้างเอง) — `.sql` = 0 ไฟล์
- 8.2 ค่าเริ่มต้นอยู่ที่เดียว — `SITE_DEFAULTS`/`STORE_DEFAULTS` · nav items ใช้ `routeKey` (F-13)
- 8.3 Storage บรนด์ asset
- 8.4 `safeExternal` เป็นเส้นชีวิต
- 8.5 cache strategy: `TAGS` + helper 3 ตัว
- 8.6 Maintenance mode server render เท่านั้น + fail-closed
- 8.7 Milestone 4 ไม่ลาก catalog ลง client
- 8.8 `actions.ts` — requireAdmin + Zod + version + audit + invalidate
- 8.9 การ์ดในหน้า appearance + `useUnsavedChangesGuard`
- 8.10 `api/og` อ่านภาษาไทยได้ (ttf เท่านั้น)

---

## 9. ส่วนที่ 5 — แอดมิน

- 9.1 Auth สามชั้น: RLS → `requireAdmin()` (C-5) → middleware (matcher แคบ) · PKCE callback (C-25)
- 9.2 Mobile admin — bottom nav 5 ปุ่ม 64px + safe area · ไม่ให้ปุ่มชนกัน (save z-40 56px, nav z-30 64px, เนื้อหา `pb-28 lg:pb-8`) · ย่อภาพก่อนส่ง ไม่มี HEIC
- 9.3 Cache ชั้นแอดมิน — `unstable_cache` + TAGS สำหรับ public-safe, ไม่ cache สำหรับ cookie-bound
- 9.4 รายการ Server Action ทั้งหมด + ตาราง invalidate
- 9.5 บังคับ URL ที่ schema ไม่ใช่ UI

---

## 10. ส่วนที่ 6 — ภาษาไทย

- 10.1 โครงไฟล์ข้อความ + `MessageKey` + `t()`
- 10.2 ข้อความอัปโหลดรูป
- 10.3 เซสชันหมดอายุระหว่างแก้ไข (re-auth modal ทับหน้าเดิม)
- 10.4 ไม่ใช่ผู้ดูแลเข้า `/admin` (C-5)
- 10.5 แคตตาล็อกว่าง / filter ล้ม / save ไม่สำเร็จ / conflict
- 10.6 Validation messages (Zod)
- 10.7 ข้อความตามหน้าจอ (หน้า admin ทั้งหมด)
- 10.8 ตัวเลือกสกุลเงิน + `formatPrice`/`formatCount`/`formatDateTime` · **bigint ห้ามข้าม RSC boundary**
- 10.9 สิ่งที่ห้ามพลาด

---

## 11. ส่วนที่ 7 — ทดสอบและ Deploy

- 11.1 `next.config.ts` เจ้าของเดียว (remotePatterns จาก env, CSP, bodySizeLimit)
- 11.2 Auth cookie + middleware
- 11.3 ชุดทดสอบ: type/lint/unit/guard/smoke/e2e + รายการ Vitest และ Playwright ที่ต้องเขียน
- 11.4 ลำดับ Deploy
- 11.5 เกณฑ์รับงาน 12 ข้อ

---

## 12. ลำดับการพัฒนา M0–M15

M0 scaffold · M1 ฐานข้อมูล · M2 เครื่องมือรูป/สกุลเงิน · M3 allowlist/validation/theme · M4 primitives · **M5 หน้าลูกค้า static (ส่งให้ดูครั้งแรก)** · M6 catalog+filters · M7 หน้าสินค้า+SEO · M8 auth+shell · M9 CRUD สินค้า+อัปโหลด · M10 หมวดหมู่+ตั้งค่าร้าน · M11 appearance+maintenance · M12 ข้อความไทย · M13 e2e+a11y · M14 CI+smoke · M15 deploy

ลำดับบังคับ: M1 ก่อนทุกอย่าง · M3 ก่อน M5 · M8 ก่อน M9 · M12 ก่อน M15

---

## 13. ความเสี่ยงและข้อจำกัด (14 ข้อ)

1. แอดมินบันทึกแล้วเว็บยังโชว์ค่าเก่า · 2. รายการชนกันของผู้ดูแลสองคน · 3. รูปอัปโหลดกิน memory · 4. `force-dynamic` ที่ root ฆ่า ISR · 5. `revalidateTag(t,'max')` 2 คนพร้อมกัน · 6. แผนที่ข้อความไทยใหญ่ · 7. `typedRoutes: false` ไม่จับ URL ผิด · 8. ไม่มี checkout/ชำระเงิน · 9. ไม่มีระบบสั่งซื้อ/ตะกร้า/สต็อกจริง · 10. ราคาผสมสองสกุลเงิน · 11. ภาษาไทยเดียว · 12. ภาษาอังกฤษในโค้ด · 13. หน้า admin หนัก · 14. vitejs dev dep

### 13.1 สิ่งที่ระบบนี้จะทำไม่ได้ดี (12 ข้อ)

---

## 14. รายการตรวจก่อนส่งมอบ

คำสั่ง A–H + เช็กลิสต์ที่ต้องทำด้วยมือ 17 ข้อ

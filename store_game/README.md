# store_game — เว็บไอดีเกมพร้อมเล่น

ร้านไอดีเกมออนไลน์ หน้าเว็บสาธารณะเป็นภาษาไทยทั้งหมด จุดต่อกับลูกค้าคือ WhatsApp
เว็บไซต์**ไม่รับชำระเงิน** และ**ไม่ส่งข้อความให้ลูกค้าเอง** — ลูกค้ากดคัดลอกรหัสสินค้า
เปิด WhatsApp แล้ววางรหัสเอง

Next.js 15.5.27 · App Router · TypeScript strict · Tailwind v4 · Supabase

---

## เริ่มใช้งาน

### 1. ติดตั้งและตั้งค่า

```bash
npm install
cp .env.example .env.local     # แล้วกรอกค่าให้ครบ
node scripts/check-env.mjs     # ยืนยันว่า env ครบก่อนรัน
```

### 2. ตั้งค่าฐานข้อมูล

Supabase Dashboard → **SQL Editor** → รันไฟล์ใน `supabase/migrations/` **ตามลำดับ**
ตั้งแต่ `00_verify_preflight.sql` ถึง `16_views_and_guards.sql`

วิธีละเอียด รวมถึงการสร้างผู้ดูแลคนแรก: [`supabase/migrations/README.md`](supabase/migrations/README.md)

จากนั้นรัน `99_seed_demo.sql` **เฉพาะตอน dev**

### 3. ปิด email sign-up

Supabase Dashboard → **Authentication → Sign In / Providers → Email**
→ ปิด **Allow new users to sign up**

ทำ**ก่อน** grant ใด ๆ ถ้าเปิดไว้ ผู้เข้าชมทั่วไปจะสร้าง `authenticated` JWT ได้เอง
แล้วเข้าถึงทุกสิทธิ์ของ `authenticated` ทันที

### 4. รัน

```bash
npm run dev        # http://localhost:3000
```

---

## คำสั่ง

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run dev` | เซิร์ฟเวอร์ dev |
| `npm run build` | build production |
| `npm run typecheck` | `tsc --noEmit` ทั้งโปรเจกต์รวม tests |
| `npm run lint` | ESLint (ใช้ `eslint .` เพราะ `next lint` ถูกเลิกใน 15.5) |
| `npm test` | unit tests ทั้งหมด |
| `npm run test:guard` | database guard tests (ต้องมี `SUPABASE_CI_DB_URL`) |
| `npm run test:e2e` | Playwright |
| `npm run check:no-secret` | ยืนยันว่าไม่มี service_role key ในโปรเจกต์ |
| `npm run smoke:routes` | ตรวจทุก route บนเซิร์ฟเวอร์ที่ deploy แล้ว |
| `npm run smoke:images` | ตรวจว่ารูปทุก path ในฐานข้อมูลโหลดได้ |

---

## Route

### หน้าสาธารณะ

| Route | หมายเหตุ |
|---|---|
| `/` | หน้าแรก |
| `/products` | แคตตาล็อก + ตัวกรอง — **facet ทุกแบบเป็น noindex** |
| `/products/[productCode]` | หน้าสินค้า + JSON-LD |
| `/games` · `/games/[slug]` | หมวดหมู่เกม |
| `/contact` | ติดต่อร้าน |
| `/concept/a` · `/b` · `/c` | 3 คอนเซปต์หน้าแรก · **noindex** · `/concept/zzz` → 404 |
| `/icon` · `/apple-icon` · `/api/og` | metadata routes (dynamic ทั้งหมด) |
| `/sitemap.xml` · `/robots.txt` · `/manifest.webmanifest` | — |

### หน้าแอดมิน

| Route | หมายเหตุ |
|---|---|
| `/admin/login` | อยู่ในกลุ่ม `(auth)` จึงไม่ติด gate |
| `/admin` | แดชบอร์ด |
| `/admin/products` · `/admin/products/[productId]` | จัดการสินค้า + อัปโหลดรูป |
| `/admin/categories` | จัดการหมวดหมู่เกม |
| `/admin/settings` | ตั้งค่าร้าน + โหมดปรับปรุง |
| `/admin/appearance` | ปรับแต่งหน้าเว็บ + ตัวอย่างสด |

**กฎการเข้าถึง**: ไม่ล็อกอิน → redirect ไป `/admin/login` · ล็อกอินแล้วแต่ไม่มีสิทธิ์
→ เห็นหน้า **403** (ไม่ redirect กลับ เพราะจะวนกลับไม่จบ และการบอกว่า "ไม่ใช่ผู้ดูแล"
จะทำให้หน้า login เป็นตัวบอกว่าใครคือผู้ดูแล)

---

## เรื่องความปลอดภัยที่ต้องรู้

### ไม่มี service_role key ในโปรเจกต์

แอปใช้ `NEXT_PUBLIC_SUPABASE_ANON_KEY` ตัวเดียว ซึ่งเป็น public key ที่ตั้งใจเผยแพร่
`npm run check:no-secret` จะ fail ถ้าพบ service_role key หรือ JWT secret ที่ใดในโปรเจกต์

### E2E seed ทำอย่างไร (F-16)

ชุดทดสอบอัตโนมัติใช้ **Supabase project ที่แยกออกไปต่างหาก** ไม่ใช่ตัวที่ใช้ QA มือ

1. `scripts/seed-e2e.mjs` ใช้ `SUPABASE_ACCESS_TOKEN` (CI secret) สร้างผู้ใช้ผู้ดูแล
   ผ่าน Management API
2. ใช้ `SUPABASE_CI_DB_URL` apply `supabase/seed.e2e.sql`
3. ทั้งสองค่าเป็น CI secret ที่ไม่เคยเข้าสู่ bundle ของแอป
4. production บน Vercel **ไม่มี** ค่าเหล่านี้เลย

### สามชั้นของการคุ้มกัน

| ชั้น | กลไก |
|---|---|
| 1 | RLS policy บนทุกตาราง ใช้ `is_admin()` เป็นจุดตัดสินสิทธิ์จุดเดียว |
| 2 | `requireAdmin()` ทุก layout และทุก Server Action |
| 3 | middleware — **มีแค่รีเฟรช session** ไม่ใช่ชั้นบังคับ |

### Security definer อยู่ใน private schema (F-07)

ฟังก์ชันที่ต้องเป็น definer ทั้งหมดอยู่ใน schema `private` ซึ่งไม่มี grant ให้ใคร
`public` มีเฉพาะ wrapper แบบ `security invoker` ที่จำเป็นต่อ RLS และ Data API เท่านั้น
ฟังก์ชัน introspection สำหรับตรวจ schema ไม่มี wrapper ใน `public` เลย

---

## โครงสร้าง

```
src/
├─ app/
│  ├─ (public)/       หน้าลูกค้า ผ่าน maintenance gate
│  ├─ (admin)/        หน้าแอดมิน ผ่าน requireAdmin
│  ├─ (auth)/         login (ไม่ผ่าน gate)
│  └─ icon/ api/ sitemap.ts robots.ts manifest.ts
├─ lib/
│  ├─ cache/tags.ts         TAGS ชุดเดียวของทั้งโปรเจกต์ + helper 3 ตัว
│  ├─ validation/           url allowlist · route registry · zod schemas
│  ├─ storage/              bucket · path · URL
│  ├─ images/               limits + sharp pipeline
│  ├─ catalog/              queries · search-params · seo · ldjson
│  ├─ i18n/th/              ข้อความไทยทั้งหมด
│  └─ supabase/             client สองตัว (anon + cookie-bound)
├─ components/        ui · site · catalog · product · home · admin
└─ hooks/

supabase/migrations/   00…16 + 99_seed_demo.sql
tests/
├─ unit/              ไม่แตะเครือข่าย
├─ guards/            ต้องมี credential ของ CI
└─ e2e/               Playwright
```

---

## หมายเหตุทางเทคนิค

### Next.js pin ไว้ที่ 15.5.27

โค้ดทั้งหมดเขียนสำหรับ 15.5 โดยเฉพาะ:

- `revalidateTag(tag)` รับ **argument เดียว** — รูปแบบ `(tag, 'max')` เป็นของ Next 16
  และเรียกใน 15.5 ไม่ผ่าน
- `revalidatePath(path)` และ `revalidatePath(path, 'layout')`
- `generateSitemaps` ใน `src/app/sitemap.ts`
- `params` และ `searchParams` เป็น `Promise` ต้อง `await`
- middleware ชื่อ `src/middleware.ts` (Next 16 เปลี่ยนเป็น `proxy.ts`)
- `react/no-danger` เป็น error แต่มีจุดเดียวที่ disable ได้ คือ JSON-LD ที่ escape ด้วย `ldJson()`

### root layout เป็น `force-dynamic`

สีแบรนด์ถูกฉีดลง `<html style>` ซึ่งต้องเห็นค่าล่าสุดทุก request
ผลที่ต้องยอมรับคือ **HTML ฝั่ง public ไม่ถูก cache**
ข้อมูลแคตตาล็อกยังถูก cache ที่ fetch layer ตาม tag

### Maintenance เป็น fail-closed

ถ้าอ่านค่าตั้งค่าไม่ได้ → แสดงหน้าปรับปรุง ไม่ใช่เปิดเว็บไซต์
เหตุผล: ฐานข้อมูลมีปัญหาชั่วคราวไม่ควรทำให้แคตตาล็อกหายไป

### การเข้ารหัสลิงก์

`src/lib/validation/url.ts` คือ allowlist ตัวเดียวของโปรเจกต์
`wa.me/<เลข>` ผ่าน · `https://www.facebook.com.evil.com/` ไม่ผ่าน
มีเทสต์ `sql-allowlist-parity.test.ts` อ่านไฟล์ SQL มาเทียบว่าสองฝั่งตรงกัน

### เมนูใช้ `routeKey` เท่านั้น

`src/lib/validation/route-keys.ts` คือแหล่งความจริงเดียวของ URL ภายในทั้งเว็บไซต์
แอดมินเลือกปลายทางจาก dropdown ไม่ได้พิมพ์เอง → เมนูจึงชี้ไปหน้าที่ไม่มีไม่ได้
registry ไม่มี `/admin` ทำให้ลิงก์เข้าแอดมินโผล่บนหน้าเว็บสาธารณะไม่ได้

---

## Deploy

### Vercel

```bash
npx vercel@latest link
npx vercel@latest env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel@latest env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel@latest env add NEXT_PUBLIC_SITE_URL production     # โดเมนจริง
npx vercel@latest --prod
```

โปรเจกต์ต้องเป็น **Public framework preset** ไม่งั้นจะไม่ได้ค่า `NEXT_PUBLIC_*` ตอน build

### หลัง deploy — อย่าลืม

1. ตั้ง DNS ตามที่ Vercel ให้
2. Supabase → **Authentication → URL Configuration**
   - Site URL = `https://example.com`
   - Redirect URLs = `https://example.com/auth/callback` (**ไม่ใส่ wildcard**)
   - ถ้าใช้ www ให้เพิ่มแถวนั้นด้วย — สองโดเมนคือสอง origin คนละ redirect
3. รัน smoke:
```bash
SMOKE_BASE_URL=https://example.com npm run smoke:routes
curl -sI https://example.com/admin/ | head -1     # ต้องเป็น 307 ไม่ใช่ 200
curl -s  https://example.com/robots.txt           # ต้องมี Disallow: /admin
```

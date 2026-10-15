# บันทึกการตัดสินใจระหว่างทำ

## เรื่อง: `npm install` ถูกระบบบล็อก — แก้แล้ว
เดิมระบบจำกัดสิทธิ์การติดตั้งแพ็กเกจจาก npm registry ทำให้ยังไม่ได้ยืนยันอะไรเลย

**ยืนยันแล้ววันที่ 2026-10-05** — รันครบทุกอย่างและผ่านหมด:

| คำสั่ง | ผล |
|---|---|
| `npx tsc --noEmit` | ผ่าน ไม่มี error |
| `npx eslint .` | ผ่าน (เหลือ warning 1 เรื่องที่ `eslint.config.mjs` anonymous default export) |
| `npx vitest run` | ผ่าน 190 เทสต์ |
| `npx next build` | ผ่าน 23 route |
| `node scripts/assert-no-service-key.mjs` | ผ่าน ไม่มี service_role key |

## เรื่อง: grant ที่ติด default ของ Supabase — C-33 ผิดในฐานข้อมูลจริง
`14_grants.sql` เดิมมีแค่ `alter default privileges ... revoke all on tables` ซึ่งครอบคลุมเฉพาะตารางที่จะถูก
**สร้างหลังจากนั้น** ไม่ได้แตะตาราง 8 ตารางที่ migration `03`–`09` สร้างไว้ก่อนแล้ว
Supabase ติดตั้ง grant กว้าง ๆ มาให้ `anon`/`authenticated` ตั้งแต่ตอนสร้างโปรเจกต์ และไม่มีคำสั่งไหนในไฟล์นั้นถอนมันออก

ผลที่วัดได้: anonymous อ่าน `public.admins` และ `public.admin_audit_log` ได้ (ได้ `200 []`)
RLS ยังบังคับให้เห็นศูนย์แถว จึง **ยังไม่มีข้อมูลรั่ว** แต่เป็นการพึ่ง policy ชั้นเดียว
ถ้าวันหนึ่ง policy หลุด รายชื่อผู้ดูแลจะเปิดให้ผู้เข้าชมทุกคนอ่านได้ทันที

**แก้แล้ว** — เพิ่ม blanket revoke ก่อน grant รายตารางใน `14_grants.sql` แล้ว regenerate `REBUILD.sql`
ต้องรัน `REBUILD.sql` อีกครั้งใน SQL Editor ถึงจะมีผลกับฐานข้อมูลจริง

## เรื่อง: guard test ข้ามเงียบ ๆ เพราะ vitest ไม่อ่าน `.env.local`
Next.js โหลด `.env.local` ให้แอป แต่ Vitest ไม่ทำ — guard suite อ่าน `process.env` ได้ค่าว่าง
แล้วรายงานว่า "21 skipped" ซึ่งอ่านเหมือนผ่าน

นี่คือรูปแบบความล้มเหลวที่ guard ตั้งใจป้องกันอยู่แล้ว: **การ์ดที่รันไม่ได้เงียบ ๆ แย่กว่าไม่มีการ์ด**
เพราะ CI รายงานเขียว ทั้งที่ไม่ได้ตรวจอะไรเลย

**แก้แล้ว** — `vitest.config.ts` อ่าน `.env.local`/`.env` เข้า `test.env` โดยค่าจริงใน environment ชนะไฟล์เสมอ
(ไม่ให้ secret ใน CI ถูกค่าบนดิสก์ทับ)

## เรื่อง: `X-Robots-Tag` บนหน้า maintenance (F-12)
แผนเดิมสั่งให้ `(public)/layout.tsx` ตั้ง header `X-Robots-Tag: noindex`
**ทำไม่ได้** — layout ใน App Router เขียน response header ไม่ได้ มีแต่หน้า page
ที่ทำได้ผ่าน return value ของ `next/headers`

**สิ่งที่ทำแทน** (เลือกทางแรกตาม F-12 ที่อนุญาต):
- `<meta name="robots" content="noindex, nofollow">` จาก layout
- `robots.ts` คืน `disallow: '/'` ระหว่าง maintenance
- header ที่คงไว้จริงคือ `/api/:path*` ซึ่งตั้งแบบ static ใน `next.config.ts`
  — เป็น implementation จริง ไม่ใช่ข้อความที่ไม่มีโค้ดรองรับ
- acceptance #7 แก้จาก "ต้องมี header" เป็น "ต้องมี meta robots noindex"

## เรื่อง: F-02 (การพิสูจน์ว่า cache ทำงาน)
แผนเดิมบอกว่า supabase-js ถูก cache เพราะส่ง `next: { tags }` เข้า `global.fetch`
แต่ F-02 ห้ามอ้างเช่นนั้นโดยไม่มี test

**สิ่งที่ทำ**: ใช้ `unstable_cache(fn, key, { tags, revalidate })` เป็นชั้น cache จริง
และ `tests/unit/cache-tags.test.ts` ตรวจว่า
- ทุก read ประกาศ tag จาก `TAGS` เท่านั้น
- ไม่มี `revalidateTag` / `revalidatePath` นอก `tags.ts`
- ทุก `unstable_cache` มี block `tags:` ที่อ้าง `TAGS.`

`global.fetch` ยังคงรับ tags ไว้ เป็นชั้นที่สอง แต่ไม่ได้อ้างว่าเป็นตัวหลัก

## เรื่อง: `react cache()` (F-15)
`cache()` ใช้ใน `getDictionary` เพื่อ memo ระดับ request เท่านั้น
มี comment ระบุชัดว่าไม่ใช่ persistent cache เพื่อไม่ให้มีใครเข้าใจผิดว่า
ข้อมูลจะไม่หลุด cache ข้าม request

## เรื่อง: Next.js version
pin ที่ **15.5.27** ไม่ใช่ latest (16.3.8) เพราะ
- แผนใช้ `revalidateTag(tag, 'max')` ซึ่งเป็น API ของ 15.x
- Next 16 เปลี่ยนชื่อ `middleware.ts` เป็น `proxy.ts`
- `generateSitemaps` และ `params` เป็น Promise เป็น API ของ 15.x

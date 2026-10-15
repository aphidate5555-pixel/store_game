# guard tests

ตรวจว่าฐานข้อมูลที่ deploy ไว้ตรงกับที่โค้ดคาดไว้ และตรวจว่า anonymous ทำอะไรไม่ได้

## ทำไมต้องใช้ credential สองตัว (F-06)

| ใช้ตรวจ | ใช้ credential | ทำไม |
|---|---|---|
| anonymous behaviour | `NEXT_PUBLIC_SUPABASE_ANON_KEY` ผ่าน Data API | นี่คือสิ่งที่เบราว์เซอร์ของผู้เข้าชมถืออยู่จริง |
| schema drift | `SUPABASE_CI_DB_URL` ผ่าน direct Postgres | ฟังก์ชัน introspection อยู่ใน schema `private` และถูก revoke จาก `public` แล้ว (F-07) — anon key เรียกไม่ได้ **เลย** |

ถ้าใช้ anon key ตรวจ schema ต้อง grant สิทธิ์นั้นให้ และ grant ที่ให้ anonymous
enumerate ทุกตารางทุกคอลัมน์ของโปรเจกต์แย่กว่าการไม่มี drift test เสียอีก

## วิธีรัน

```bash
# ต้องมี env ทั้งสองชุดใน .env.local หรือ CI secrets
npm run test:guard
```

## ถ้า env ไม่ครบ

Suite จะ **skip พร้อมเหตุผลที่พิมพ์ออกมา** ไม่ใช่ผ่านเงียบ ๆ
ตัวอย่างข้อความที่จะเห็น:

```
[guards] ข้าม schema drift — ขาด SUPABASE_CI_DB_URL (ดู tests/guards/README.md)
```

## สิ่งที่แต่ละไฟล์ตรวจ

### schema.test.ts
- ทุกตารางใน schema `public` เปิด RLS แล้ว
- มีตารางอย่างน้อย 8 ตาราง
- schema `private` ไม่มีสิทธิ์ USAGE สำหรับ `anon`
- ฟังก์ชัน introspection ถูก revoke EXECUTE จาก `PUBLIC`
- anonymous อ่าน `admins` / `admin_audit_log` ไม่ได้ (C-33)
- anonymous เขียน `products` / `store_settings` ไม่ได้
- anonymous ลบ settings ไม่ได้ (ไม่มี grant + ไม่มี policy + trigger)
- `is_admin()` คืน `false` ไม่ใช่ error
- anonymous เรียก `private.tables_missing_rls()` ไม่ได้ — **การที่
  ชื่อฟังก์ชันนี้ไม่อยู่ในชนิด RPC ที่ generate ไว้ คือหลักฐานระดับ compile
  ว่ามันไม่ถูกเปิดผ่าน Data API**

### settings-columns.test.ts
- `store_settings` มี 24 คอลัมน์ตามลำดับที่ประกาศไว้
- ไม่มีคอลัมน์ที่ถูกลบตามสัญญา: `whatsapp_link`, `shop_name`, `nav_items`, `hero_*`
- รายชื่อในฐานข้อมูลตรงกับ `Database['public']['Tables']['store_settings']['Row']`

### database-types.test.ts
- ตารางทั้ง 8 มีอยู่จริงในฐานข้อมูล
- enum ทั้งสามถูกประกาศไว้
- `search_products` คืน `(items, total)` — ไม่มีคีย์ `rows` (F-01)
- param เป็น enum ไม่ใช่ text (C-17)
- media path เป็น bucket-relative และ cover คือ `position = 0` (F-04, F-05)

## หมายเหตุเรื่อง credential

- **`SUPABASE_CI_DB_URL` คือ CI secret เท่านั้น ห้ามอยู่ใน production**
- ตัวแอปใช้ `NEXT_PUBLIC_SUPABASE_ANON_KEY` ตัวเดียว ไม่มี service_role key
  ที่ไหนในโปรเจกต์ — `scripts/assert-no-service-key.mjs` ตรวจและ fail CI ให้
- ถ้าจะรัน guard ในเครื่องตัวเอง ให้ใช้ connection string ของ **โปรเจกต์ E2E ที่คุณ
  ควบคุมเอง** อย่าใช้ตัว hosted ที่ใช้ QA มือ

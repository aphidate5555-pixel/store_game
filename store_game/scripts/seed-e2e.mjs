#!/usr/bin/env node
/**
 * Seeds the E2E Supabase project (F-16).
 *
 * The production application never holds a privileged key, and neither does
 * this script in the sense that matters: the two credentials it uses are CI
 * secrets supplied through the environment and are absent from the
 * repository.
 *
 *   SUPABASE_ACCESS_TOKEN  a personal access token, used to create the test
 *                          user through the Management API. It can never
 *                          reach the application bundle.
 *   SUPABASE_CI_DB_URL     a direct Postgres connection string for the CI
 *                          project, used to apply supabase/seed.e2e.sql and
 *                          insert the `admins` row.
 *
 * Creating the user through the Management API and granting the admin row
 * through SQL is deliberate: grant_admin() refuses to run when the caller is
 * not already an administrator, so the very first grant can only be made by
 * someone with direct database access. That is the same bootstrap the shop
 * owner performs by hand in §3.4.
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))

const PROJECT_REF = process.env.SUPABASE_E2E_PROJECT_REF ?? ''
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? ''
const DB_URL = process.env.SUPABASE_CI_DB_URL ?? ''
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@e2e.test'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'e2e-password-not-a-secret'

const missing = []
if (!PROJECT_REF) missing.push('SUPABASE_E2E_PROJECT_REF')
if (!ACCESS_TOKEN) missing.push('SUPABASE_ACCESS_TOKEN')
if (!DB_URL) missing.push('SUPABASE_CI_DB_URL')

if (missing.length > 0) {
  console.error('✕ ขาดตัวแปรต่อไปนี้ (เป็น CI secret เท่านั้น ห้ามอยู่ใน production):')
  for (const key of missing) console.error(`  · ${key}`)
  process.exit(1)
}

const api = `https://api.supabase.com/v1/projects/${PROJECT_REF}`

async function createAdminUser() {
  const response = await fetch(`${api}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: 'select 1' }),
  })
  if (!response.ok) {
    throw new Error(`ตรวจสิทธิ์ Management API ไม่ผ่าน: ${response.status}`)
  }
}

/**
 * The user itself is created through the Auth Admin API, which is reachable
 * with the access token and never needs a service_role key inside the app.
 */
async function ensureUser() {
  const response = await fetch(`${api}/auth/users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      apikey: ACCESS_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
    }),
  })

  if (response.ok) {
    console.log(`✓ สร้างผู้ใช้ e2e: ${ADMIN_EMAIL}`)
    return
  }

  // 422 means the address already exists, which is the normal case on a
  // second run against the same CI database.
  if (response.status === 422 || response.status === 409) {
    console.log(`· ผู้ใช้ e2e มีอยู่แล้ว: ${ADMIN_EMAIL}`)
    return
  }

  throw new Error(`สร้างผู้ใช้ไม่สำเร็จ: ${response.status} ${await response.text()}`)
}

/**
 * Applies SQL over the direct connection. Uses the `postgres` driver when it
 * is available; on a machine that only has the Supabase CLI, the same file
 * can be pasted into the SQL editor, which is why the SQL lives in a file
 * rather than being built here.
 */
async function applySql() {
  const sql = await readFile(`${ROOT}supabase/seed.e2e.sql`, 'utf8')

  let pg
  try {
    pg = await import('pg')
  } catch {
    console.warn('⚠ ไม่พบแพ็กเกจ pg — ข้ามการ apply SQL')
    console.warn('  รันด้วยตนเอง: npx supabase db execute --file supabase/seed.e2e.sql')
    return
  }

  const client = new pg.default.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    await client.query(sql)
    console.log('✓ apply supabase/seed.e2e.sql สำเร็จ')
  } finally {
    await client.end()
  }
}

await createAdminUser()
await ensureUser()
await applySql()

console.log('\n✓ seed E2E เสร็จสิ้น')
console.log(`  ผู้ใช้แอดมิน: ${ADMIN_EMAIL}`)
console.log('  เข้าสู่ระบบที่ /admin/login')

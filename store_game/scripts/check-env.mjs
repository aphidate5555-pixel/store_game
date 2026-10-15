#!/usr/bin/env node
/**
 * Verifies the environment is complete and well formed before dev or build,
 * so a missing variable fails with a Thai message instead of a Next.js
 * hydration error three screens deep.
 */
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))

const REQUIRED = [
  { key: 'NEXT_PUBLIC_SUPABASE_URL', pattern: /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', pattern: /^(sb_publishable_|eyJ)[A-Za-z0-9._-]{20,}$/ },
  { key: 'NEXT_PUBLIC_SITE_URL', pattern: /^https?:\/\/[^\s]+$/ },
]

function loadEnvFile(path) {
  if (!existsSync(path)) return {}
  const out = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return out
}

const fileEnv = {
  ...loadEnvFile(`${ROOT}.env.local`),
  ...loadEnvFile(`${ROOT}.env`),
}
const env = { ...fileEnv, ...process.env }

const problems = []

for (const { key, pattern } of REQUIRED) {
  const value = env[key]
  if (!value) {
    problems.push(`ขาดค่า ${key} — เพิ่มใน .env.local`)
    continue
  }
  if (!pattern.test(value)) {
    problems.push(`${key} มีรูปแบบไม่ถูกต้อง`)
  }
}

if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  problems.push('ยังตั้งค่า Supabase ไม่ครบ จึงยังรัน dev/build ไม่ได้')
}

if (problems.length > 0) {
  console.error('✕ ตรวจ env ไม่ผ่าน:')
  for (const problem of problems) console.error(`  · ${problem}`)
  process.exit(1)
}

console.log('✓ env ครบถ้วน')
console.log(`  Supabase : ${env.NEXT_PUBLIC_SUPABASE_URL}`)
console.log(`  Site URL : ${env.NEXT_PUBLIC_SITE_URL}`)

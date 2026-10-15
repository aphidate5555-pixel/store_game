import { z } from 'zod'

/**
 * Environment validation, run once at module load (F-16, C-44).
 *
 * Everything here is a public browser value. There is deliberately no field
 * for a privileged key: a `service_role` key has no legitimate reason to be
 * reachable from application code, and `scripts/assert-no-service-key.mjs`
 * fails the build if one is ever found in `.env*`.
 *
 * E2E and CI values (`SUPABASE_E2E_URL`, `SUPABASE_E2E_ANON_KEY`,
 * `SUPABASE_ACCESS_TOKEN`, `SUPABASE_CI_DB_URL`) are intentionally absent:
 * they live in the CI project, never in the application bundle.
 *
 * Validation runs eagerly rather than lazily. A missing variable must fail
 * loudly at the first import, in Thai, instead of surfacing as
 * `TypeError: Cannot read properties of undefined` deep inside a fetch call.
 */

const REQUIRED_MESSAGE = 'ยังไม่ได้ตั้งค่า กรุณาเพิ่มค่านี้ในไฟล์ .env.local'

const supabaseUrlSchema = z
  .string({ required_error: REQUIRED_MESSAGE, invalid_type_error: REQUIRED_MESSAGE })
  .trim()
  .min(1, REQUIRED_MESSAGE)
  .url('รูปแบบ URL ไม่ถูกต้อง ตัวอย่างที่ถูกต้องคือ https://xxxxxxxxxxxx.supabase.co')

const supabaseAnonKeySchema = z
  .string({ required_error: REQUIRED_MESSAGE, invalid_type_error: REQUIRED_MESSAGE })
  .trim()
  .min(1, REQUIRED_MESSAGE)
  .refine((value) => value.length >= 20, 'คีย์สาธารณะสั้นเกินไป กรุณาตรวจสอบว่าคัดลอกมาครบ')

const siteUrlSchema = z
  .string({ required_error: REQUIRED_MESSAGE, invalid_type_error: REQUIRED_MESSAGE })
  .trim()
  .min(1, REQUIRED_MESSAGE)
  .url('รูปแบบ URL ไม่ถูกต้อง ตัวอย่างที่ถูกต้องคือ https://example.com')
  .refine(
    (value) => value.startsWith('https://') || value.startsWith('http://'),
    'URL ของเว็บไซต์ต้องขึ้นต้นด้วย http:// หรือ https://',
  )
  .refine((value) => {
    try {
      const { pathname } = new URL(value)
      return pathname === '/' || pathname === ''
    } catch {
      return false
    }
  }, 'URL ของเว็บไซต์ต้องเป็นรากของโดเมน เช่น https://example.com โดยไม่ต้องใส่พาธต่อท้าย')

/** The complete set of variables the application is allowed to read. */
export const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: supabaseUrlSchema,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKeySchema,
  NEXT_PUBLIC_SITE_URL: siteUrlSchema,
})

export type Env = z.infer<typeof envSchema>

/**
 * Parses and returns the validated environment, or throws with a Thai message
 * that names every offending variable at once. Listing all failures together
 * matters: `scripts/check-env.mjs` reports this string verbatim, and fixing
 * three variables one restart at a time is the failure mode this avoids.
 */
export function parseEnv(): Env {
  const result = envSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  })

  if (result.success) return result.data

  const problems: string[] = []
  for (const issue of result.error.issues) {
    const name = issue.path.length > 0 ? String(issue.path[0]) : 'ตัวแปรสภาพแวดล้อม'
    const message = problems.some((line) => line.startsWith(`${name}:`))
      ? ''
      : `${name}: ${issue.message}`
    if (message !== '') problems.push(message)
  }

  throw new Error(`ตั้งค่าตัวแปรสภาพแวดล้อมไม่ถูกต้อง\n- ${problems.join('\n- ')}`)
}

/** Throws only when something is actually wrong; safe to call at import time. */
function envOrThrow(): Env {
  return parseEnv()
}

/**
 * The validated environment. `parseEnv()` runs on first access and the result
 * is memoised, so a hot server does not re-validate on every Supabase client
 * creation while a missing variable still fails at import time.
 */
let cached: Env | null = null

export function getEnv(): Env {
  cached ??= envOrThrow()
  return cached
}

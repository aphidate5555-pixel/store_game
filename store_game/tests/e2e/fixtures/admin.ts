import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import {
  test as base,
  chromium,
  type BrowserContext,
  type BrowserContextOptions,
  type Page,
} from '@playwright/test'

/**
 * Administrator session, shared across the suite.
 *
 * Signing in once in globalSetup and reusing the storage state is not only
 * faster: signing in per test would trip Supabase's own rate limit, and the
 * resulting failures look like application bugs.
 */
const STORAGE_PATH = join(process.cwd(), 'tests', '.auth', 'admin.json')

export interface AdminCredentials {
  readonly email: string
  readonly password: string
}

export function readAdminCredentials(): AdminCredentials | null {
  const email = process.env.E2E_ADMIN_EMAIL ?? ''
  const password = process.env.E2E_ADMIN_PASSWORD ?? ''
  if (email === '' || password === '') return null
  return { email, password }
}

export const hasAdmin = (): boolean => readAdminCredentials() !== null

export function storageStatePath(): string {
  return STORAGE_PATH
}

/**
 * Called from playwright.config.ts globalSetup.
 *
 * A missing credential is not an error: the suite still runs the public
 * tests, and the admin ones skip with a printed reason. Failing here instead
 * would make a contributor unable to run anything at all.
 */
export async function signInAsAdmin(baseURL: string): Promise<void> {
  const credentials = readAdminCredentials()
  if (!credentials) {
    console.warn(
      '[e2e] ข้ามการเข้าสู่ระบบผู้ดูแล — ขาด E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD ' +
        '(ดู tests/e2e/fixtures/admin.ts)',
    )
    return
  }

  if (existsSync(STORAGE_PATH)) {
    console.log('[e2e] ใช้ session ผู้ดูแลที่บันทึกไว้แล้ว')
    return
  }

  mkdirSync(dirname(STORAGE_PATH), { recursive: true })

  const browser = await chromium.launch()
  try {
    const context = await browser.newContext({ baseURL })
    const page: Page = await context.newPage()

    await page.goto('/admin/login')
    await page.fill('#email', credentials.email)
    await page.fill('#password', credentials.password)
    await page.click('button[type="submit"]')

    // The login action redirects on success, so waiting for the URL is both
    // faster and a stronger assertion than a fixed sleep.
    await page.waitForURL(/\/admin(?!\/login)/, { timeout: 20_000 })

    const stored = await readStorageState(context)
    if (!stored) {
      throw new Error('เข้าสู่ระบบสำเร็จแต่ไม่พบ session cookie')
    }

    // Refuses to save a page that is still the login form.
    if (page.url().includes('/admin/login')) {
      throw new Error('ยังค้างที่หน้าเข้าสู่ระบบ — อีเมลหรือรหัสผ่านไม่ถูกต้อง')
    }

    await context.storageState({ path: STORAGE_PATH })
    console.log(`[e2e] บันทึก session ผู้ดูแลไว้ที่ ${STORAGE_PATH}`)
  } finally {
    await browser.close()
  }
}

async function readStorageState(context: BrowserContext): Promise<unknown | null> {
  const cookies = await context.cookies()
  if (cookies.length === 0) return null
  return { cookies, origins: [] }
}

/**
 * The admin fixture.
 *
 * It skips rather than fails when there is no session, and says why. An
 * assertion failure here would read as "the admin area is broken" when the
 * truth is "this machine has no admin credentials".
 */
export const test = base.extend<{ adminPage: Page; asAdmin: boolean }>({
  asAdmin: [
    async ({}, use) => {
      const credentials = readAdminCredentials()
      const stateExists = existsSync(STORAGE_PATH)

      await use(credentials !== null && stateExists)
    },
    { auto: false },
  ],

  adminPage: async ({ browser }, use) => {
    const stateExists = existsSync(STORAGE_PATH)

    if (!stateExists) {
      test.skip(
        !stateExists,
        'ยังไม่มี session ผู้ดูแล — ตั้ง E2E_ADMIN_EMAIL และ E2E_ADMIN_PASSWORD แล้วรันอีกครั้ง',
      )
    }

    // The shape is taken from Playwright's own option type rather than
    // written out, so a format change shows up here rather than as a
    // confusing runtime failure deep inside a fixture.
    const state = JSON.parse(readFileSync(STORAGE_PATH, 'utf8')) as NonNullable<
      BrowserContextOptions['storageState']
    >

    const context = await browser.newContext({ storageState: state })
    const page = await context.newPage()

    await use(page)
    await context.close()
  },
})

export { base as rawTest }

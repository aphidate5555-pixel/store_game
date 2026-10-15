import { readAdminCredentials, signInAsAdmin } from './tests/e2e/fixtures/admin'

/**
 * Signs the administrator in once, before the suite.
 *
 * One sign-in, reused via storage state. Signing in per test would be slower
 * and would eventually trip Supabase's rate limit, and the resulting
 * failures would look like application bugs.
 *
 * A missing credential is a warning, not an error: the public tests still
 * run, and the admin ones skip with the same reason printed.
 */
export default async function globalSetup(config: {
  use?: { baseURL?: string }
}): Promise<void> {
  const baseURL =
    config.use?.baseURL ?? process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3100'

  if (readAdminCredentials() === null) {
    console.warn(
      '[e2e] ไม่ได้ตั้ง E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD — เทสต์ฝั่งแอดมินจะถูกข้าม',
    )
  }

  await signInAsAdmin(baseURL)
}

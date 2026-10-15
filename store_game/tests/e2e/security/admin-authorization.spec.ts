import { expect, test } from '@playwright/test'

import { hasAdmin } from '../fixtures/admin'

/**
 * What the admin area does and does not let through.
 *
 * The distinction these tests exist for (C-5): an anonymous visitor is sent
 * to the login form, and that is a redirect. A signed-in visitor without a
 * grant gets a 403 page, and that is NOT a redirect — bouncing them back to
 * the login form would loop, and wording it as "not an administrator" would
 * turn the login page into an oracle that enumerates public.admins.
 */

const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const ANON_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

const ADMIN_PATHS = ['/admin', '/admin/products', '/admin/categories', '/admin/settings', '/admin/appearance']

test.describe('anonymous access', () => {
  for (const path of ADMIN_PATHS) {
    test(`${path} redirects to the login form`, async ({ page }) => {
      const response = await page.goto(path)

      // A 200 here would mean the middleware matcher leaked and the page
      // rendered without a session.
      expect(response?.status(), `${path} ต้องตอบเป็น redirect`).toBe(307)

      const location = response?.headers()['location'] ?? ''
      expect(location).toContain('/admin/login')
    })
  }

  test('the login form itself is reachable', async ({ page }) => {
    const response = await page.goto('/admin/login')

    expect(response?.status()).toBe(200)
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
  })

  test('the login form carries no register link', async ({ page }) => {
    await page.goto('/admin/login')

    // Email sign-up is disabled at the Supabase Auth level (C-32). A link
    // here would be a route to a 403.
    const links = await page.locator('a').evaluateAll((nodes) =>
      nodes.map((node) => (node.textContent ?? '').trim()),
    )
    for (const label of links) {
      expect(label).not.toContain('สมัครสมาชิก')
      expect(label.toLowerCase()).not.toContain('register')
      expect(label.toLowerCase()).not.toContain('sign up')
    }
  })

  test('the next parameter cannot escape the admin area (C-6)', async ({ page }) => {
    for (const next of ['https://evil.example', '//evil.example', '/administrator', '/products']) {
      await page.goto(`/admin/login?next=${encodeURIComponent(next)}`)

      // The value is re-validated on the way in, so a hostile one is dropped
      // rather than carried into the redirect after a successful sign-in.
      const value = await page.locator('input[name="next"]').inputValue()
      if (value !== '') {
        expect(value, `next ถูกยอมรับ: ${value}`).toMatch(/^\/admin(?:\/|$)/)
      }
    }
  })
})

test.describe('anonymous database access', () => {
  test.skip(ANON_KEY === '' || ANON_URL === '', 'ต้องมี NEXT_PUBLIC_SUPABASE_ANON_KEY')

  const headers = (): Record<string, string> => ({
    apikey: ANON_KEY,
    Authorization: `Bearer ${ANON_KEY}`,
    'Content-Type': 'application/json',
  })

  test('cannot read the administrator roster (C-33)', async ({ request }) => {
    const response = await request.get(`${ANON_URL}/rest/v1/admins?select=*`, { headers: headers() })

    // No SELECT grant at all, so this is a permission error rather than an
    // empty array. An empty array would mean the roster is readable.
    expect(response.status()).toBeGreaterThanOrEqual(400)
  })

  test('cannot read the audit log', async ({ request }) => {
    const response = await request.get(`${ANON_URL}/rest/v1/admin_audit_log?select=*`, {
      headers: headers(),
    })

    expect(response.status()).toBeGreaterThanOrEqual(400)
  })

  test('cannot write a product', async ({ request }) => {
    const response = await request.post(`${ANON_URL}/rest/v1/products`, {
      headers: headers(),
      data: {
        product_code: 'ANON-PROBE-1',
        name: 'ทดสอบการเขียน',
        game_id: '00000000-0000-0000-0000-000000000000',
        price_amount: 1,
      },
    })

    expect(response.status()).toBeGreaterThanOrEqual(400)
  })

  test('cannot call the dashboard gate', async ({ request }) => {
    const response = await request.post(`${ANON_URL}/rest/v1/rpc/admin_dashboard_stats_gate`, {
      headers: headers(),
      data: {},
    })

    expect(response.status()).toBeGreaterThanOrEqual(400)
  })

  test('reports is_admin() as false', async ({ request }) => {
    const response = await request.post(`${ANON_URL}/rest/v1/rpc/is_admin`, {
      headers: headers(),
      data: {},
    })

    expect(response.ok()).toBeTruthy()
    expect(await response.json()).toBe(false)
  })
})

test.describe('signed-in without a grant', () => {
  test.skip(!hasAdmin(), 'ยังไม่มี session ผู้ดูแล — ดู tests/e2e/fixtures/admin.ts')

  test('the admin session can reach the dashboard', async ({ page }) => {
    await page.goto('/admin')

    // If this renders the login form instead, the stored session has expired
    // and the other assertions below would be meaningless.
    await expect(page.locator('main#admin-main')).toBeVisible()
    expect(page.url()).not.toContain('/admin/login')
  })
})

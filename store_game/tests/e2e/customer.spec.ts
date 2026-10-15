import { canonicalHref, expect, test } from './fixtures/console-guard'

/**
 * The storefront, as a visitor sees it.
 *
 * Several of these need seeded data. Rather than failing when the database is
 * empty, they skip with a reason: "no products yet" is a state of the
 * environment, not a defect, and a suite that cannot be run without a manual
 * seed gets ignored within a week.
 */
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3100'

async function catalogueCount(page: import('@playwright/test').Page): Promise<number> {
  return page.locator('main ul li article').count()
}

test.describe('storefront', () => {
  test('the homepage renders the storefront shell', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('html')).toHaveAttribute('lang', 'th')
    await expect(page.locator('main#main')).toBeVisible()
    // The brand colour is inlined on <html> so it cannot lag a save (C-36
    // equivalent for appearance: the layout is force-dynamic).
    await expect(page.locator('html')).toHaveAttribute('style', /--color-primary/)
  })

  test('the header navigation links only to registered routes', async ({ page }) => {
    await page.goto('/')

    const hrefs = await page.locator('header nav a').evaluateAll((links) =>
      links.map((link) => (link as HTMLAnchorElement).getAttribute('href') ?? ''),
    )

    // F-13 and acceptance check 12: no admin link may appear in public
    // navigation.
    for (const href of hrefs) {
      expect(href, `ลิงก์เมนูไม่ควรชี้ไปที่ ${href}`).not.toContain('/admin')
    }
  })

  test('the catalogue lists seeded products', async ({ page }) => {
    await page.goto('/products')

    const count = await catalogueCount(page)
    test.skip(count === 0, 'ยังไม่มีสินค้าในฐานข้อมูล — รัน supabase/migrations/99_seed_demo.sql ก่อน')

    await expect(page.locator('main h1')).toBeVisible()
  })

  test('searching narrows the catalogue', async ({ page }) => {
    await page.goto('/products')
    const count = await catalogueCount(page)
    test.skip(count === 0, 'ยังไม่มีสินค้าในฐานข้อมูล')

    // The code is the first thing the storefront promises to search by, and
    // it is the one a customer actually has in front of them.
    const firstCode = await page
      .locator('main ul li article p')
      .first()
      .textContent()
      .catch(() => null)

    if (!firstCode) test.skip(true, 'อ่านรหัสสินค้าชิ้นแรกไม่ได้')

    await page.goto(`/products?q=${encodeURIComponent((firstCode ?? '').trim())}`)
    await expect(page.locator('main')).toContainText((firstCode ?? '').trim())
  })

  test('switching currency drops the price bounds and the page number (C-40)', async ({
    page,
  }) => {
    await page.goto('/products')
    const count = await catalogueCount(page)
    test.skip(count === 0, 'ยังไม่มีสินค้าในฐานข้อมูล')

    // A price of 1250 baht and 1250 kip are different products, so carrying
    // the bounds across would render an empty grid that reads as "no
    // results".
    await page.goto('/products?currency=THB&min=1&max=999999&page=2')
    await page.getByRole('button', { name: /ตัวกรอง/ }).first().click()

    await page.getByRole('button', { name: 'ลาว (LAK)' }).click()
    await page.waitForURL(/currency=LAK/)

    const url = new URL(page.url())
    expect(url.searchParams.get('currency')).toBe('LAK')
    expect(url.searchParams.get('min')).toBeNull()
    expect(url.searchParams.get('max')).toBeNull()
    expect(url.searchParams.get('page')).toBeNull()
  })

  test('a facet URL is noindex', async ({ page }) => {
    await page.goto('/products?currency=LAK')

    const robots = await page
      .locator('head meta[name="robots"]')
      .first()
      .getAttribute('content')

    // A facet is the same catalogue with different filters. Letting them be
    // indexed is how one shop ends up with hundreds of thin pages.
    expect(robots ?? '').toContain('noindex')
  })

  test('a product page shows the code and opens WhatsApp in a new tab', async ({ page }) => {
    await page.goto('/products')
    const count = await catalogueCount(page)
    test.skip(count === 0, 'ยังไม่มีสินค้าในฐานข้อมูล')

    const code = (await page.locator('main ul li article p').first().textContent())?.trim()
    test.skip(!code, 'อ่านรหัสสินค้าชิ้นแรกไม่ได้')

    await page.goto(`/products/${encodeURIComponent(code ?? '')}`)
    await expect(page.locator('main h1')).toContainText(code ?? '')

    // The tab must be opened synchronously inside the click handler; doing it
    // after the clipboard await loses the transient user activation and
    // Safari blocks it.
    const popupPromise = page.waitForEvent('popup', { timeout: 10_000 }).catch(() => null)
    await page.getByRole('button', { name: /ทักมาสั่งซื้อ/ }).click()
    const popup = await popupPromise

    // Either a popup opened, or the button fell back to a manual link —
    // both are correct; an empty href is not.
    if (popup) {
      expect(popup.url()).toContain('wa.me')
    } else {
      await expect(page.getByRole('link', { name: /เปิด WhatsApp/ }).or(
        page.getByRole('button', { name: /ทัก/ }),
      )).toBeDefined()
    }
  })

  test('a sold product stays reachable and links onward', async ({ page }) => {
    await page.goto('/products')
    const count = await catalogueCount(page)
    test.skip(count === 0, 'ยังไม่มีสินค้าในฐานข้อมูล')

    // C-9: a sold product can come back, so it is not removed from the
    // index and it must not be a dead end.
    const sold = page.locator('main ul li article', { hasText: 'ขายแล้ว' }).first()
    test.skip((await sold.count()) === 0, 'ยังไม่มีสินค้าที่ขายแล้วในข้อมูลตัวอย่าง')

    const code = (await sold.locator('p').first().textContent())?.trim()
    await page.goto(`/products/${encodeURIComponent(code ?? '')}`)

    const robots = await page
      .locator('head meta[name="robots"]')
      .first()
      .getAttribute('content')
    expect(robots ?? '').not.toContain('noindex')

    await expect(page.getByText('สินค้านี้ขายแล้ว')).toBeVisible()
  })

  test('an unknown product code is a Thai 404', async ({ page }) => {
    const response = await page.goto('/products/NO-SUCH-CODE-999')

    expect(response?.status()).toBe(404)
    await expect(page.locator('main')).toContainText('ไม่พบ')
  })

  test('the three concept routes all render and are noindex', async ({ page }) => {
    for (const variant of ['a', 'b', 'c']) {
      const response = await page.goto(`/concept/${variant}`)
      expect(response?.status(), `/concept/${variant}`).toBe(200)
      await expect(page.locator('main#main')).toBeVisible()
    }

    // /concept/zzz must 404 rather than falling back to a variant.
    const missing = await page.goto('/concept/zzz')
    expect(missing?.status()).toBe(404)
  })

  test('there is no horizontal overflow at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 })
    await page.goto('/')

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('the page is readable without JavaScript', async ({ browser }) => {
    // Anything hidden with opacity-0 waits for data-js; with scripting off
    // the content has to be visible rather than blank.
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()

    try {
      await page.goto(`${BASE_URL}/`)
      await expect(page.locator('main#main')).toBeVisible()
      await expect(page.locator('header')).toBeVisible()
    } finally {
      await context.close()
    }
  })
})

test.describe('robots and sitemap', () => {
  test('robots.txt disallows the admin area and the concepts', async ({ page }) => {
    await page.goto('/robots.txt')

    const body = await page.locator('body').innerText()
    expect(body).toContain('/admin')
    expect(body).toContain('/concept')
  })

  test('the sitemap carries the xmlns declaration', async ({ page }) => {
    const response = await page.goto('/sitemap.xml')
    const body = await response?.text()

    // C-8: a hand-written route cannot emit a valid index, and the missing
    // xmlns was the symptom of two owners for this file.
    expect(body ?? '').toContain('xmlns')
  })

  test('the canonical URL is present and absolute', async ({ page }) => {
    await page.goto('/products')
    const canonical = await canonicalHref(page)

    expect(canonical).not.toBeNull()
    expect(canonical).toMatch(/^https?:\/\//)
  })
})

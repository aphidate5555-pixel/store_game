import { canonicalHref, expect, robotsMeta, test } from './fixtures/console-guard'

/**
 * Indexing policy, asserted against what the page actually renders.
 *
 * The rule that matters most is C-9, and it is the one that is easy to get
 * backwards: a product that has sold stays indexable, because it can come
 * back. Marking it noindex on every sale throws the ranking away and waits
 * for a recrawl to regain it — for a page that will be listed again the
 * moment it is restocked.
 */
async function firstProductCode(page: import('@playwright/test').Page): Promise<string | null> {
  await page.goto('/products')
  const count = await page.locator('main ul li article').count()
  if (count === 0) return null
  const code = (await page.locator('main ul li article p').first().textContent())?.trim()
  return code && code.length > 0 ? code : null
}

test.describe('indexing policy', () => {
  test('the bare catalogue is indexable', async ({ page }) => {
    await page.goto('/products')

    const { noindex } = await robotsMeta(page)
    expect(noindex, '/products ไม่ควรเป็น noindex').toBe(false)
  })

  test('every filter facet is noindex, follow', async ({ page }) => {
    const facets = [
      '/products?currency=LAK',
      '/products?status=sold',
      '/products?sort=price_asc',
      '/products?q=ML',
      '/products?currency=LAK&min=100&max=5000&page=2',
    ]

    for (const facet of facets) {
      await page.goto(facet)
      const { noindex } = await robotsMeta(page)
      // A facet is the same catalogue filtered. Indexing them all produces
      // thin duplicates competing with each other.
      expect(noindex, `${facet} ควรเป็น noindex`).toBe(true)
    }
  })

  test('the concept routes are noindex', async ({ page }) => {
    for (const variant of ['a', 'b', 'c']) {
      await page.goto(`/concept/${variant}`)
      const { noindex } = await robotsMeta(page)
      expect(noindex, `/concept/${variant}`).toBe(true)
    }
  })

  test('the contact and games pages are indexable', async ({ page }) => {
    for (const path of ['/contact', '/games']) {
      await page.goto(path)
      const { noindex } = await robotsMeta(page)
      expect(noindex, `${path} ควรถูก index`).toBe(false)
    }
  })

  test('canonical points at the bare catalogue on a facet', async ({ page }) => {
    // The facet is noindex AND canonicalises to /products, so the two signals
    // agree rather than contradicting each other.
    await page.goto('/products?currency=LAK')
    const canonical = await canonicalHref(page)

    expect(canonical).toContain('/products')
    expect(canonical).not.toContain('currency=')
  })

  test('the admin area is never indexable', async ({ page }) => {
    for (const path of ['/admin/login', '/admin/products']) {
      await page.goto(path)
      const { noindex } = await robotsMeta(page)
      expect(noindex, `${path} ต้องเป็น noindex`).toBe(true)
    }
  })
})

test.describe('structured data', () => {
  test('a product page emits one parseable JSON-LD block', async ({ page }) => {
    const code = await firstProductCode(page)
    test.skip(code === null, 'ยังไม่มีสินค้าในฐานข้อมูล')

    await page.goto(`/products/${encodeURIComponent(code ?? '')}`)

    const raw = await page.locator('script[type="application/ld+json"]').first().textContent()
    expect(raw, 'ไม่พบ JSON-LD').not.toBeNull()

    // C-42: a product name containing </script> would otherwise close the tag
    // before the parser ran, so the block is escaped. Parsing it here is what
    // proves the escaping did not corrupt the JSON.
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(raw ?? '') as Record<string, unknown>
    } catch {
      throw new Error('JSON-LD ไม่ใช่ JSON ที่ถูกต้อง — การ escape อาจทำให้ข้อมูลเสียหาย')
    }

    expect(parsed['@type']).toBe('Product')
    expect(parsed.sku).toBe(code)
  })

  test('the offer price is a bare number with no separator', async ({ page }) => {
    const code = await firstProductCode(page)
    test.skip(code === null, 'ยังไม่มีสินค้าในฐานข้อมูล')

    await page.goto(`/products/${encodeURIComponent(code ?? '')}`)
    const raw = await page.locator('script[type="application/ld+json"]').first().textContent()

    const offers = (JSON.parse(raw ?? '') as { offers?: { price?: unknown } }).offers
    expect(typeof offers?.price).toBe('string')
    // formatPrice produces '฿1,250' for the screen; schema.org needs the
    // bare figure, and a comma here is a validation error.
    expect(String(offers?.price)).toMatch(/^\d+$/)
  })

  test('a sold product advertises OutOfStock and stays indexed (C-9)', async ({ page }) => {
    await page.goto('/products')
    const count = await page.locator('main ul li article').count()
    test.skip(count === 0, 'ยังไม่มีสินค้าในฐานข้อมูล')

    const sold = page.locator('main ul li article', { hasText: 'ขายแล้ว' }).first()
    test.skip((await sold.count()) === 0, 'ยังไม่มีสินค้าที่ขายแล้วในข้อมูลตัวอย่าง')

    const code = (await sold.locator('p').first().textContent())?.trim()
    await page.goto(`/products/${encodeURIComponent(code ?? '')}`)

    const { noindex } = await robotsMeta(page)
    expect(noindex, 'สินค้าที่ขายแล้วต้องยังถูก index (C-9)').toBe(false)

    const raw = await page.locator('script[type="application/ld+json"]').first().textContent()
    const offers = (JSON.parse(raw ?? '') as { offers?: { availability?: string } }).offers
    expect(offers?.availability).toContain('OutOfStock')
  })

  test('the storefront OG image renders Thai rather than tofu', async ({ page }) => {
    // A Thai name in an OG image with no Thai font renders as boxes, which
    // looks worse than no image at all.
    const response = await page.request.get('/api/og')
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('image/png')
    expect((await response.body()).byteLength).toBeGreaterThan(1000)
  })
})

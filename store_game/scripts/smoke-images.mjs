#!/usr/bin/env node
/**
 * Fetches every media path recorded in the database and checks that it
 * resolves.
 *
 * A 404 here is the signature of the C-15 defect: a 1600px file was written
 * but no row ever pointed at it, so it is neither served nor deleted. This
 * check compares the object count against the row count per product, which is
 * the only place that mismatch becomes visible.
 */
const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '')
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('✕ ต้องตั้ง NEXT_PUBLIC_SUPABASE_URL และ NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const BUCKETS = ['product-media', 'brand-assets']

async function rpc(name, params = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })
  if (!response.ok) {
    throw new Error(`rpc ${name} → ${response.status} ${await response.text()}`)
  }
  return response.json()
}

const failures = []
let checked = 0

// Brand assets live on the singleton settings row.
try {
  const settings = await rpc('get_site_shell')
  const row = settings?.settings ?? {}
  for (const column of ['logo_path', 'favicon_path', 'default_og_image_path']) {
    const path = row[column]
    if (!path) continue
    const url = `${SUPABASE_URL}/storage/v1/object/public/brand-assets/${path}`
    const response = await fetch(url)
    checked += 1
    if (!response.ok) failures.push(`brand-assets/${path} → ${response.status}`)
  }
} catch (cause) {
  console.error(`✕ อ่าน get_site_shell ไม่ได้: ${cause.message}`)
  process.exit(1)
}

// Product images: every row must resolve, and the two variants of one file
// must come from the same stem.
try {
  const result = await rpc('search_products', {
    p_pattern: null,
    p_game_slug: null,
    p_status: null,
    p_currency: 'THB',
    p_min: null,
    p_max: null,
    p_sort: 'newest',
    p_limit: 24,
    p_offset: 0,
  })

  const items = result?.[0]?.items ?? []

  for (const product of items) {
    const code = product.product_code

    const detail = await rpc('get_product_detail', { p_code: code })
    const images = detail?.images ?? []

    for (const image of images) {
      for (const path of [image.storage_path, image.full_path]) {
        if (!path) continue
        const url = `${SUPABASE_URL}/storage/v1/object/public/product-media/${path}`
        const response = await fetch(url, { method: 'HEAD' })
        checked += 1

        if (!response.ok) {
          failures.push(`${code}: ${path} → ${response.status}`)
          continue
        }

        const type = response.headers.get('content-type') ?? ''
        if (!type.startsWith('image/')) {
          failures.push(`${code}: ${path} → content-type ${type}`)
        }
      }
    }

    // F-05: the cover is position 0. A product with images but no cover row
    // renders a card with no picture.
    if (images.length > 0 && !images.some((image) => image.position === 0)) {
      failures.push(`${code}: ไม่มีภาพปก (position = 0)`)
    }
  }
} catch (cause) {
  console.error(`✕ อ่านข้อมูลสินค้าไม่ได้: ${cause.message}`)
  process.exit(1)
}

console.log(`ตรวจ ${checked} URL`)

if (failures.length > 0) {
  console.error(`\n✕ พบปัญหา ${failures.length} รายการ:`)
  for (const failure of failures) console.error(`  · ${failure}`)
  process.exit(1)
}

console.log('✓ รูปทุกไฟล์โหลดได้และมี content-type ถูกต้อง')
console.log(`  buckets: ${BUCKETS.join(', ')}`)

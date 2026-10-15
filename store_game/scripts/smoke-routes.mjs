#!/usr/bin/env node
/**
 * Production smoke test: every public route answers with the expected status,
 * and every admin route redirects an anonymous visitor to the login form.
 *
 * Run against a deployed site, not against `next dev`.
 */
const BASE = (process.env.SMOKE_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(
  /\/$/,
  '',
)

if (!BASE) {
  console.error('✕ ต้องตั้ง SMOKE_BASE_URL หรือ NEXT_PUBLIC_SITE_URL')
  process.exit(1)
}

const PUBLIC_ROUTES = [
  { path: '/', expect: [200] },
  { path: '/products', expect: [200] },
  { path: '/games', expect: [200] },
  { path: '/contact', expect: [200] },
  { path: '/concept/a', expect: [200] },
  { path: '/concept/b', expect: [200] },
  { path: '/concept/c', expect: [200] },
  // A variant that does not exist must 404 rather than render a concept.
  { path: '/concept/zzz', expect: [404] },
  { path: '/products/does-not-exist-code', expect: [404] },
]

const ADMIN_ROUTES = [
  '/admin',
  '/admin/products',
  '/admin/categories',
  '/admin/settings',
  '/admin/appearance',
]

const failures = []

async function check(path, expected) {
  let response
  try {
    response = await fetch(`${BASE}${path}`, { redirect: 'manual' })
  } catch (cause) {
    failures.push(`${path} — เชื่อมต่อไม่ได้: ${cause.message}`)
    return
  }

  const status = response.status
  const ok = expected.includes(status)
  if (!ok) {
    failures.push(`${path} — ได้ ${status} คาดหวัง ${expected.join('/')}`)
  }
  console.log(`${ok ? '✓' : '✗'} ${status} ${path}`)
}

for (const route of PUBLIC_ROUTES) {
  await check(route.path, route.expect)
}

// Anonymous access to the admin area must be a redirect, never a 200.
// A 200 here means the middleware matcher leaked and the page renders
// without a session (C-24).
for (const path of ADMIN_ROUTES) {
  let response
  try {
    response = await fetch(`${BASE}${path}`, { redirect: 'manual' })
  } catch (cause) {
    failures.push(`${path} — เชื่อมต่อไม่ได้: ${cause.message}`)
    continue
  }

  const status = response.status
  const location = response.headers.get('location') ?? ''

  const isRedirect = status === 307 || status === 308
  const goesToLogin = location.includes('/admin/login')

  if (!isRedirect || !goesToLogin) {
    failures.push(
      `${path} — ได้ ${status} ${location || '(ไม่มี location)'} · คาดหวัง 307 → /admin/login`,
    )
  }
  console.log(`${isRedirect && goesToLogin ? '✓' : '✗'} ${status} ${path} → ${location || '-'}`)
}

// The sitemap must carry the xmlns declaration. A missing one means a
// hand-written route is shadowing the file convention (C-8).
const sitemap = await fetch(`${BASE}/sitemap.xml`)
const xml = await sitemap.text()
if (!xml.includes('xmlns')) {
  failures.push('/sitemap.xml — ไม่มี xmlns')
}
console.log(`${xml.includes('xmlns') ? '✓' : '✗'} sitemap.xml มี xmlns`)

const robots = await fetch(`${BASE}/robots.txt`)
const robotsText = await robots.text()
for (const needle of ['/admin', '/concept']) {
  if (!robotsText.includes(needle)) failures.push(`/robots.txt — ไม่พบ ${needle}`)
}
console.log(`${robotsText.includes('/admin') ? '✓' : '✗'} robots.txt มี Disallow: /admin`)

if (failures.length > 0) {
  console.error(`\n✕ smoke ล้มเหลว ${failures.length} รายการ:`)
  for (const failure of failures) console.error(`  · ${failure}`)
  process.exit(1)
}

console.log('\n✓ smoke ผ่านทั้งหมด')

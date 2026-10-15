import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { invalidateCatalog, invalidateProduct, invalidateSiteConfig, TAGS } from '@/lib/cache/tags'
import { ALL_CATALOG_TAGS } from './helpers/tag-inventory'

const SRC = join(process.cwd(), 'src')
const CACHE_TAGS_FILE = join(SRC, 'lib', 'cache', 'tags.ts')

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === '.next') continue
      out.push(...walk(full))
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full)
    }
  }
  return out
}

const files = walk(SRC)
const read = (file: string): string => readFileSync(file, 'utf8')

/**
 * The taxonomy itself.
 */
describe('TAGS', () => {
  it('exposes one tag per data domain plus a per-product factory', () => {
    expect(TAGS.settings).toBe('settings')
    expect(TAGS.sections).toBe('site_sections')
    expect(TAGS.games).toBe('games')
    expect(TAGS.catalog).toBe('catalog')
    expect(TAGS.featured).toBe('featured')
    expect(TAGS.dashboard).toBe('dashboard')
  })

  it('normalises the product tag so ML-1 and ml-1 share one entry', () => {
    expect(TAGS.product('ml-20481')).toBe('product:ML-20481')
  })
})

/**
 * The failure this file exists to prevent: an administrator saves, the write
 * succeeds, and the storefront keeps serving the previous value. That happens
 * whenever a read declares one tag and a write invalidates another.
 */
describe('cache invalidation coverage', () => {
  it('no module calls revalidateTag or revalidatePath outside tags.ts', () => {
    const offenders: string[] = []

    for (const file of files) {
      if (file === CACHE_TAGS_FILE) continue
      const contents = read(file)
      if (/revalidateTag\s*\(/.test(contents)) offenders.push(file)
      if (/revalidatePath\s*\(/.test(contents)) offenders.push(file)
    }

    expect(offenders).toEqual([])
  })

  it('no module declares a tag array with string literals', () => {
    // Precisely: a literal inside a `tags: [...]` option. A broader grep would
    // also flag table names ('games'), route keys ('games') and the scope
    // names accepted by getPublicDb(), none of which are cache tags.
    const offenders: string[] = []
    const tagArray = /tags:\s*\[([^\]]*)\]/g

    for (const file of files) {
      if (file === CACHE_TAGS_FILE) continue
      const contents = read(file)
      let match: RegExpExecArray | null
      while ((match = tagArray.exec(contents)) !== null) {
        const body = match[1] ?? ''
        const literal = /['"][a-z_]+['"]/.exec(body)
        if (literal) offenders.push(`${file} → ${literal[0]}`)
      }
    }

    expect(offenders).toEqual([])
  })

  it('every catalogue read declares the tags its writer invalidates', () => {
    // A read that omits TAGS.games is invisible to a category rename, which
    // is the "saved but the page did not change" report from the field.
    const contents = read(join(SRC, 'lib', 'catalog', 'queries.ts'))
    for (const tag of ALL_CATALOG_TAGS) {
      expect(contents).toContain(`TAGS.${tag}`)
    }
  })

  it('every read declares at least one tag', () => {
    const contents = read(join(SRC, 'lib', 'catalog', 'queries.ts'))
    const cacheCalls = contents.match(/unstable_cache\(/g) ?? []
    expect(cacheCalls.length).toBeGreaterThan(0)

    const tagBlocks = contents.match(/tags:\s*\[[^\]]*\]/g) ?? []
    for (const block of tagBlocks) {
      expect(block).toContain('TAGS.')
    }
  })
})

/**
 * The helpers themselves. These are pure wrappers around next/cache, so the
 * assertions are on the arguments rather than on the effect.
 */
describe('invalidation helpers', () => {
  it('never revalidates a concrete product by a bracketed placeholder (C-14)', () => {
    const contents = read(CACHE_TAGS_FILE)
    const calls = contents.match(/revalidatePath\([^)]*\)/g) ?? []

    for (const call of calls) {
      // A dynamic segment such as '/concept/[variant]' is Next's documented
      // form and means "every value of this segment" — it is correct. What
      // C-14 forbids is '/products/[code]', where the placeholder looks like a
      // concrete product but revalidates nothing at all.
      expect(call).not.toMatch(/\/products\/\[/)
    }
  })

  it('revalidates the concrete product path built from the code', () => {
    const contents = read(CACHE_TAGS_FILE)
    expect(contents).toContain('revalidatePath(`/products/${normalized}`)')
  })

  it('uses the one-argument revalidateTag of the pinned Next 15.5.27 (F-17)', () => {
    // The (tag, 'max') profile in the source plan is a Next 16 API and does
    // not exist in 15.5.
    const contents = read(CACHE_TAGS_FILE)
    const calls = contents.match(/revalidateTag\([^)]*\)/g) ?? []
    expect(calls.length).toBeGreaterThan(0)
    for (const call of calls) {
      expect(call.split(',').length).toBe(1)
    }
  })

  it('invalidateProduct falls back rather than silently doing nothing', () => {
    // An empty product code must still invalidate something; a no-op here is
    // exactly the stale-cache bug.
    const contents = read(CACHE_TAGS_FILE)
    expect(contents).toMatch(/if\s*\(!normalized\)\s*\{[\s\S]*?invalidateCatalog\(\)/)
  })

  it('invalidateSiteConfig revalidates the root layout, where the colour lives', () => {
    const contents = read(CACHE_TAGS_FILE)
    expect(contents).toMatch(/revalidatePath\('\/',\s*'layout'\)/)
  })

  it('all three helpers are exported', () => {
    expect(typeof invalidateCatalog).toBe('function')
    expect(typeof invalidateProduct).toBe('function')
    expect(typeof invalidateSiteConfig).toBe('function')
  })
})

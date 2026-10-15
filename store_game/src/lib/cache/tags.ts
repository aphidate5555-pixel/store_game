import { revalidatePath, revalidateTag } from 'next/cache'

/**
 * The single source of truth for cache tags across the whole project (C-7).
 *
 * Rules enforced by tests/unit/cache-tags.test.ts:
 *  - no literal tag string anywhere outside this file
 *  - no direct `revalidateTag` / `revalidatePath` call outside this file
 *  - every read path declares its tags through `TAGS`
 *  - every admin write path routes through one of the three helpers below
 *
 * Next.js 15.5: `revalidateTag` takes a single tag. The two-argument
 * `(tag, 'max')` profile in the source plan is a Next 16 API and does not
 * exist in the pinned version, so it is not used (F-17).
 */
export const TAGS = {
  settings: 'settings',
  sections: 'site_sections',
  games: 'games',
  catalog: 'catalog',
  featured: 'featured',
  dashboard: 'dashboard',
  product: (code: string) => `product:${code.toUpperCase()}`,
} as const

export type CatalogTag = (typeof TAGS)[keyof typeof TAGS] | ReturnType<typeof TAGS.product>

/** Tags that describe the site shell: settings + every section payload. */
const SITE_CONFIG_TAGS: readonly string[] = [
  TAGS.settings,
  TAGS.sections,
  TAGS.games,
  TAGS.catalog,
  TAGS.featured,
]

/** Tags that describe catalog content: products, games and featured picks. */
const CATALOG_TAGS: readonly string[] = [
  TAGS.catalog,
  TAGS.games,
  TAGS.featured,
  TAGS.dashboard,
]

function dropAll(tags: readonly string[]): void {
  // F-17: this is the official signature of the pinned Next 15.5.27 —
  // `revalidateTag(tag: string)`. The two-argument `(tag, 'max')` form used in
  // the source plan belongs to Next 16, and calling it here does not compile.
  // The single-argument form expires the entry for the next visitor, which is
  // what an admin save needs; the stale-while-revalidate window in §13.5 of
  // the plan remains the accepted trade-off.
  for (const tag of tags) revalidateTag(tag)
}

/**
 * Called after any write to store_settings or site_sections.
 *
 * `revalidatePath('/', 'layout')` is required, not decorative: brand colours
 * are inlined into the `<html style>` attribute by the root layout, and that
 * HTML is never cached (it is force-dynamic). Without the layout-scoped
 * revalidation the browser can keep serving a stale document even though the
 * data cache was dropped.
 */
export function invalidateSiteConfig(): void {
  dropAll(SITE_CONFIG_TAGS)
  revalidatePath('/', 'layout')
  revalidatePath('/', 'page')
  revalidatePath('/products')
  revalidatePath('/games')
  revalidatePath('/concept/[variant]', 'page')
}

/** Called after any write to products or games. */
export function invalidateCatalog(): void {
  dropAll(CATALOG_TAGS)
  revalidatePath('/products')
  revalidatePath('/games')
  revalidatePath('/concept/[variant]', 'page')
  revalidatePath('/admin/products')
}

/**
 * Called after a write that affects one product (C-14).
 * Never pass a bracketed literal such as '/products/[code]' — Next treats it
 * as a literal string and revalidates nothing.
 */
export function invalidateProduct(code: string): void {
  const normalized = code.trim().toUpperCase()
  if (!normalized) {
    // Defensive: a caller that lost the product code still needs correctness,
    // so fall back to the coarse catalog invalidation.
    invalidateCatalog()
    return
  }
  revalidateTag(TAGS.product(normalized))
  dropAll(CATALOG_TAGS)
  revalidatePath('/products')
  revalidatePath(`/products/${normalized}`)
  revalidatePath('/games')
  revalidatePath('/concept/[variant]', 'page')
}

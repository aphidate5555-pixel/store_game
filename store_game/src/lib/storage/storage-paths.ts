import { randomUUID } from 'node:crypto'

import { BUCKETS, type BucketName } from './buckets'
import { CARD_SUFFIX, IMAGE_EXTENSION } from '../images/limits'

/**
 * Object path construction (F-04).
 *
 * Paths stored in the database never include the bucket name. They always
 * match one of the two shapes below, and the database enforces that with a
 * CHECK constraint calling is_media_path() (F-10), so an admin cannot store
 * a path that this module would not have produced.
 *
 *   product-media:
 *     products/<product-uuid>/<YYYY-MM>/<16hex>.webp         (1600px, "full")
 *     products/<product-uuid>/<YYYY-MM>/<16hex>-card.webp   (640px, card)
 *
 *   brand-assets:
 *     brand/<kind>/<YYYY-MM>/<16hex>.png
 *
 * The <product-uuid> first segment is what makes it possible to delete every
 * file of one product with a single prefix match, and the 16-hex suffix makes
 * collisions between two uploads in the same month impossible.
 */

const HEX16 = /^[0-9a-f]{16}$/
const YM = /^\d{4}-\d{2}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const BRAND_KINDS = ['logo', 'favicon', 'og', 'category'] as const
export type BrandKind = (typeof BRAND_KINDS)[number]

export const newStem = (): string => randomUUID().replace(/-/g, '').slice(0, 16)

const yearMonth = (now: Date): string => now.toISOString().slice(0, 7)

export interface ProductStem {
  /** Same stem for both variants — the only way `full_path` can be derived
   *  from `storage_path` and both files land under one deletable prefix. */
  readonly stem: string
  readonly yearMonth: string
}

/** Generated once per uploaded file, before the variant loop (C-15). */
export function createProductStem(now: Date = new Date()): ProductStem {
  return { stem: newStem(), yearMonth: yearMonth(now) }
}

export function buildProductPath(
  productId: string,
  stem: ProductStem,
  variantSuffix: string,
): string {
  if (!UUID.test(productId)) {
    throw new Error('invalid product id for storage path')
  }
  if (!HEX16.test(stem.stem) || !YM.test(stem.yearMonth)) {
    throw new Error('invalid product stem for storage path')
  }
  return `products/${productId}/${stem.yearMonth}/${stem.stem}${variantSuffix}${IMAGE_EXTENSION}`
}

export function buildBrandPath(kind: BrandKind, now: Date = new Date()): string {
  if (!BRAND_KINDS.includes(kind)) throw new Error('invalid brand asset kind')
  const stem = newStem()
  const ym = yearMonth(now)
  if (!HEX16.test(stem) || !YM.test(ym)) throw new Error('invalid brand path components')
  return `brand/${kind}/${ym}/${stem}.png`
}

/** Prefix match for removing every object of one product. */
export function productPathPrefix(productId: string): string | null {
  if (!UUID.test(productId)) return null
  return `products/${productId}/`
}

/** Derives the 1600px path from the 640px path. The `-card` suffix is fixed,
 *  so the relationship is reversible without a database round trip. */
export function fullPathFromCard(cardPath: string): string | null {
  if (!cardPath.endsWith(`${CARD_SUFFIX}${IMAGE_EXTENSION}`)) return null
  return cardPath.slice(0, -(CARD_SUFFIX.length + IMAGE_EXTENSION.length)) + IMAGE_EXTENSION
}

export function cardPathFromFull(fullPath: string): string | null {
  // The guard has to test the full suffix, not CARD_SUFFIX alone: '-card.webp'
  // does not end with '-card', so checking the bare suffix let a card path
  // through and produced a '-card-card.webp' name.
  if (fullPath.endsWith(`${CARD_SUFFIX}${IMAGE_EXTENSION}`)) return null
  if (!fullPath.endsWith(IMAGE_EXTENSION)) return null
  return `${fullPath.slice(0, -IMAGE_EXTENSION.length)}${CARD_SUFFIX}${IMAGE_EXTENSION}`
}

export function isValidProductPath(path: string): boolean {
  return /^products\/[0-9a-f-]{36}\/\d{4}-\d{2}\/[0-9a-f]{16}(-card)?\.webp$/.test(path)
}

export function isValidBrandPath(path: string): boolean {
  return /^brand\/(logo|favicon|og|category)\/\d{4}-\d{2}\/[0-9a-f]{16}\.png$/.test(path)
}

/** Which bucket a path belongs to, decided by its first segment. */
export function bucketForPath(path: string): BucketName | null {
  if (isValidProductPath(path)) return BUCKETS.product
  if (isValidBrandPath(path)) return BUCKETS.brand
  return null
}

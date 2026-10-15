import { BUCKETS, type BucketName } from './buckets'

/**
 * Builds the public CDN URL for a stored object (F-04).
 *
 * The value held in the database is a path *inside* the bucket, e.g.
 *   products/<uuid>/<YYYY-MM>/<16hex>-card.webp
 * The bucket name is prepended here, once, at the moment a URL is needed.
 * Storing the bucket as a prefix of the object path would make every read
 * ambiguous about which column owns the namespace, and would break the
 * moment a bucket is renamed.
 */
export function mediaUrl(bucket: BucketName, path: string | null | undefined): string | null {
  if (!path) return null
  const trimmed = path.trim()
  if (trimmed.length === 0) return null
  // Guard against a legacy row that still carries the bucket prefix, and
  // against a path that tries to escape the bucket with `..`.
  if (trimmed.includes('..') || trimmed.startsWith('/')) return null
  // Reject paths that already include the bucket name as a prefix — this would
  // produce a doubled segment (e.g. /product-media/product-media/...).
  if (trimmed.startsWith(`${bucket}/`)) return null

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return null

  return `${base.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${trimmed}`
}

/** Convenience wrappers so call sites read as intent, not as plumbing. */
export const productMediaUrl = (path: string | null | undefined): string | null =>
  mediaUrl(BUCKETS.product, path)

export const brandMediaUrl = (path: string | null | undefined): string | null =>
  mediaUrl(BUCKETS.brand, path)

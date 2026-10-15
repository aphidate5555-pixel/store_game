/**
 * The two buckets that exist, and nothing else (C-3).
 * Every upload, delete and URL build imports the name from here; no module
 * concatenates a bucket name into a string literal.
 */
export const BUCKETS = {
  product: 'product-media',
  brand: 'brand-assets',
} as const

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS]

export const BUCKET_NAMES: readonly BucketName[] = [BUCKETS.product, BUCKETS.brand]

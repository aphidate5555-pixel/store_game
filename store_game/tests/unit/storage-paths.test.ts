import { describe, expect, it } from 'vitest'

import { isValidBrandPath, isValidProductPath, fullPathFromCard, cardPathFromFull, productPathPrefix } from '@/lib/storage/storage-paths'
import { mediaUrl, productMediaUrl, brandMediaUrl } from '@/lib/storage/media-url'
import { BUCKETS } from '@/lib/storage/buckets'
import { ALLOWED_IMAGE_MIME, MAX_FILES_PER_UPLOAD, MAX_IMAGE_BYTES, MAX_INPUT_PIXELS, isAllowedImageMime, isAllowedBrandMime } from '@/lib/images/limits'

describe('storage paths exclude the bucket name (F-04)', () => {
  it('validates the product shapes', () => {
    const uuid = '3f2504e0-4f89-11d3-9a0c-0305e82c3301'
    expect(isValidProductPath(`products/${uuid}/2026-03/ab12cd34ef567890.webp`)).toBe(true)
    expect(isValidProductPath(`products/${uuid}/2026-03/ab12cd34ef567890-card.webp`)).toBe(true)
  })

  it('rejects a path that still carries the bucket prefix', () => {
    // This is the shape the earlier draft produced.
    expect(isValidProductPath('product-media/products/2026-03/ab12cd34ef567890.webp')).toBe(false)
  })

  it('rejects traversal and absolute paths', () => {
    expect(isValidProductPath('products/../../../etc/passwd')).toBe(false)
    expect(isValidBrandPath('/brand/logo/2026-03/ab12cd34ef567890.png')).toBe(false)
  })

  it('validates the brand shapes', () => {
    expect(isValidBrandPath('brand/logo/2026-03/ab12cd34ef567890.png')).toBe(true)
    expect(isValidBrandPath('brand/unknown-kind/2026-03/ab12cd34ef567890.png')).toBe(false)
  })
})

describe('full and card paths are mutually derivable (C-15)', () => {
  it('round-trips', () => {
    const card = 'products/uuid/2026-03/ab12cd34ef567890-card.webp'
    const full = fullPathFromCard(card)
    expect(full).toBe('products/uuid/2026-03/ab12cd34ef567890.webp')
    expect(cardPathFromFull(full!)).toBe(card)
  })

  it('refuses a double suffix', () => {
    expect(cardPathFromFull('products/uuid/2026-03/x-card.webp')).toBeNull()
  })

  it('produces a product-wide prefix for deletion', () => {
    const uuid = '3f2504e0-4f89-11d3-9a0c-0305e82c3301'
    expect(productPathPrefix(uuid)).toBe(`products/${uuid}/`)
    expect(productPathPrefix('not-a-uuid')).toBeNull()
  })
})

describe('mediaUrl adds the bucket exactly once', () => {
  // Set inside each test, not at describe scope: the describe body runs during
  // collection, before the environment a test body observes is finalised.
  const withBase = <T>(fn: () => T): T => {
    const original = process.env.NEXT_PUBLIC_SUPABASE_URL
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://ref.supabase.co'
    try {
      return fn()
    } finally {
      if (original === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
      else process.env.NEXT_PUBLIC_SUPABASE_URL = original
    }
  }

  it('prefixes the bucket to a bucket-relative path', () => {
    withBase(() => {
      expect(mediaUrl(BUCKETS.product, 'products/uuid/2026-03/a.webp')).toBe(
        'https://ref.supabase.co/storage/v1/object/public/product-media/products/uuid/2026-03/a.webp',
      )
    })
  })

  it('rejects a legacy path that already carries the bucket prefix', () => {
    // A path like 'product-media/products/...' would produce a doubled segment.
    withBase(() => {
      expect(mediaUrl(BUCKETS.product, '/products/uuid/a.webp')).toBeNull()
      expect(mediaUrl(BUCKETS.product, 'product-media/products/uuid/a.webp')).toBeNull()
    })
  })

  it('returns null for an empty path', () => {
    withBase(() => {
      expect(productMediaUrl(null)).toBeNull()
      expect(brandMediaUrl('')).toBeNull()
    })
  })

  it('has the two helpers agree with the generic one', () => {
    withBase(() => {
      expect(productMediaUrl('products/uuid/2026-03/a.webp')).toBe(
        mediaUrl(BUCKETS.product, 'products/uuid/2026-03/a.webp'),
      )
    })
  })
})

describe('upload limits live in one place (C-28, F-14)', () => {
  it('exposes the agreed values', () => {
    expect(MAX_IMAGE_BYTES).toBe(3_500_000)
    expect(MAX_FILES_PER_UPLOAD).toBe(5)
    expect(MAX_INPUT_PIXELS).toBe(20_000_000)
  })

  it('accepts AVIF for products but not for brand assets', () => {
    // The brand bucket and the OG renderer do not consume AVIF; the Thai copy
    // is generated from the same constants, so the two cannot disagree.
    expect(isAllowedImageMime('image/avif')).toBe(true)
    expect(isAllowedBrandMime('image/avif')).toBe(false)
  })

  it('never accepts HEIC or ICO', () => {
    expect(isAllowedImageMime('image/heic')).toBe(false)
    expect(isAllowedImageMime('image/heif')).toBe(false)
    expect(isAllowedImageMime('image/x-icon')).toBe(false)
    expect(isAllowedBrandMime('image/x-icon')).toBe(false)
  })

  it('rejects SVG, which can carry script', () => {
    expect(isAllowedImageMime('image/svg+xml')).toBe(false)
    expect(isAllowedBrandMime('image/svg+xml')).toBe(false)
  })

  it('keeps the allowed list and the copy in agreement', () => {
    const labels = ALLOWED_IMAGE_MIME.map((mime) => mime.split('/')[1])
    expect(labels).toEqual(['jpeg', 'png', 'webp', 'avif'])
  })
})

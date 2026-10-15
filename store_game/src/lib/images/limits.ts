/**
 * The single source of truth for image upload limits (C-28).
 *
 * Everything else imports from here: the server action, the sharp pipeline,
 * the storage bucket configuration, and the Thai copy shown in the admin UI.
 * There is no HEIC support and no 8 MB tier — the previous copy promising
 * both has been removed, because no decoder exists for either (F-14).
 */

/** 3.5 MB per file. Mirrored by `file_size_limit` on both buckets. */
export const MAX_IMAGE_BYTES = 3_500_000

export const MAX_FILES_PER_UPLOAD = 5

/** 20 megapixels. A 40 MP source decodes to roughly 160 MB of RGBA and
 *  exhausts the memory ceiling of a serverless function (C-27). */
export const MAX_INPUT_PIXELS = 20_000_000

export const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const
export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIME)[number]

const ALLOWED_MIME_SET = new Set<string>(ALLOWED_IMAGE_MIME)

/** Accepted for product galleries and for brand assets alike. */
export const isAllowedImageMime = (mime: string): mime is AllowedImageMime =>
  ALLOWED_MIME_SET.has(mime)

/** Product images are re-encoded to WebP, so the accepted input set is the one
 *  above. Brand assets additionally exclude AVIF because the brand-assets
 *  bucket and the `ImageResponse` OG renderer do not consume it. */
export const BRAND_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const
const BRAND_MIME_SET = new Set<string>(BRAND_IMAGE_MIME)
export const isAllowedBrandMime = (mime: string): boolean => BRAND_MIME_SET.has(mime)

/** Human readable extension list, used to build the Thai hint text so the copy
 *  can never drift from the accepted set (F-14). */
export const ALLOWED_IMAGE_EXT_LABEL = 'JPG, PNG, WebP, AVIF'
export const ALLOWED_BRAND_EXT_LABEL = 'JPG, PNG, WebP'

/** '3.5 MB' — reused verbatim in admin copy. */
export const MAX_IMAGE_BYTES_LABEL = '3.5 MB'

/** Output variants produced by sharp, in the order they are generated. */
export const IMAGE_VARIANTS = [
  { suffix: '', width: 1600, quality: 82 },
  { suffix: '-card', width: 640, quality: 78 },
] as const

export const CARD_SUFFIX = '-card'
export const IMAGE_EXTENSION = '.webp'

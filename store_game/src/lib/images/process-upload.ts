import 'server-only'

import sharp from 'sharp'

import {
  ALLOWED_IMAGE_MIME,
  IMAGE_VARIANTS,
  MAX_IMAGE_BYTES,
  MAX_INPUT_PIXELS,
  isAllowedImageMime,
} from './limits'
import { buildProductPath, createProductStem, type ProductStem } from '@/lib/storage/storage-paths'

/**
 * Turns one uploaded file into the two WebP variants the storefront uses.
 *
 * Three decisions that are not obvious from the code:
 *
 * 1. The stem is minted once, before the variant loop (C-15). Minting it
 *    inside the loop produced two unrelated filenames, so the 1600px file had
 *    no database row pointing at it: it was never served, never deleted and
 *    leaked storage forever.
 *
 * 2. The buffers are returned rather than uploaded here. A function that
 *    uploads as a side effect cannot be unit-tested, and the caller needs to
 *    remove exactly the objects it managed to create when a later step of the
 *    same file fails.
 *
 * 3. MIME and byte length are checked before decoding. limitInputPixels then
 *    caps the decode itself, so a 40 MP upload is rejected rather than turned
 *    into 160 MB of RGBA (C-27).
 */
export interface ProcessedImage {
  /** Bucket-relative path (F-04): the bucket name is added at URL build time. */
  readonly path: string
  readonly buffer: Buffer
  readonly width: number
  readonly height: number
  readonly bytes: number
}

export class ImageValidationError extends Error {
  constructor(
    readonly code: 'too_large' | 'mime' | 'pixels' | 'decode',
    message: string,
  ) {
    super(message)
    this.name = 'ImageValidationError'
  }
}

function mimeLabel(): string {
  return 'รองรับเฉพาะไฟล์ JPG, PNG, WebP และ AVIF'
}

export async function processUpload(
  file: File,
  productId: string,
  now: Date = new Date(),
): Promise<ProcessedImage[]> {
  if (!isAllowedImageMime(file.type)) {
    throw new ImageValidationError('mime', mimeLabel())
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new ImageValidationError('too_large', 'ไฟล์ใหญ่เกิน 3.5 MB')
  }

  const input = Buffer.from(await file.arrayBuffer())
  // Re-check after materialising the buffer: the File header is client
  // controlled, the byte length is not.
  if (input.byteLength > MAX_IMAGE_BYTES) {
    throw new ImageValidationError('too_large', 'ไฟล์ใหญ่เกิน 3.5 MB')
  }

  const stem: ProductStem = createProductStem(now)
  const outputs: ProcessedImage[] = []

  for (const variant of IMAGE_VARIANTS) {
    let buffer: Buffer
    try {
      buffer = await sharp(input, {
        limitInputPixels: MAX_INPUT_PIXELS,
        failOn: 'error',
      })
        .rotate()
        .resize({ width: variant.width, withoutEnlargement: true })
        .webp({ quality: variant.quality })
        .toBuffer()
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause)
      if (/limitInputPixels|too large|exceeds/i.test(message)) {
        throw new ImageValidationError('pixels', 'ไฟล์ภาพใหญ่เกินไป')
      }
      throw new ImageValidationError('decode', 'อ่านไฟล์ภาพไม่สำเร็จ')
    }

    const info = await sharp(buffer).metadata()
    outputs.push({
      path: buildProductPath(productId, stem, variant.suffix),
      buffer,
      width: info.width ?? 0,
      height: info.height ?? 0,
      bytes: buffer.byteLength,
    })
  }

  return outputs
}

export { ALLOWED_IMAGE_MIME }

'use server'

import { z } from 'zod'

import { requireAdminAction } from '@/lib/auth/require-admin'
import { createSupabaseActionClient } from '@/lib/supabase/action'
import { invalidateProduct } from '@/lib/cache/tags'
import { ImageValidationError, processUpload } from '@/lib/images/process-upload'
import { BUCKETS } from '@/lib/storage/buckets'
import { CARD_SUFFIX, MAX_FILES_PER_UPLOAD } from '@/lib/images/limits'
import type { Json } from '@/lib/database.types'

/**
 * Product and media actions.
 *
 * Every one starts with requireAdminAction(), which throws a Thai message.
 * That is not redundant with the RLS policies: Playwright exercises the
 * routes, not the actions, so an action invoked directly would otherwise be
 * the one path with no authorisation check at all.
 */

const uuidSchema = z.string().uuid()

const optionalPriceField = z.preprocess(
  (val) => {
    if (val === '' || val === null || val === undefined) return null
    return Number(val)
  },
  z
    .number({ invalid_type_error: 'กรุณากรอกราคาเป็นตัวเลขจำนวนเต็ม' })
    .int('ราคาต้องเป็นจำนวนเต็ม ไม่มีทศนิยม')
    .min(0, 'ราคาต้องไม่น้อยกว่า 0')
    .max(999_999_999, 'ราคาสูงเกินไป')
    .nullable()
    .optional(),
)

const productUpsertSchema = z.object({
  id: uuidSchema.optional(),
  productCode: z
    .string()
    .trim()
    .regex(
      /^[A-Za-z0-9][A-Za-z0-9-]{1,31}$/,
      'รหัสสินค้าต้องเป็นตัวอักษรตัวเลขและขีดกลางเท่านั้น ยาว 2–32 ตัวอักษร เช่น ML-20481',
    ),
  name: z
    .string()
    .trim()
    .min(1, 'กรุณากรอกชื่อสินค้า')
    .max(120, 'ชื่อสินค้าต้องยาวไม่เกิน 120 ตัวอักษร'),
  gameId: uuidSchema,
  priceThb: optionalPriceField,
  priceLak: optionalPriceField,
  priceAmount: optionalPriceField,
  currency: z.enum(['THB', 'LAK']).optional(),
  rank: z.string().trim().max(32, 'ข้อมูลระดับยาวเกินไป').optional(),
  heroCount: z.coerce.number().int().min(0).max(9999).default(0),
  skinCount: z.coerce.number().int().min(0).max(9999).default(0),
  binding: z.enum(['bound', 'unbound']).optional(),
  description: z.string().trim().max(2000, 'รายละเอียดยาวเกินไป').optional(),
  status: z.enum(['available', 'reserved', 'sold']).default('available'),
  isVisible: z.coerce.boolean().default(true),
  featuredAt: z.string().datetime().nullable().optional(),
})

export type ActionResult = { ok: true } | { ok: false; message: string }

const fail = (message: string): { ok: false; message: string } => ({ ok: false, message })

/**
 * Writes one audit row and never throws.
 *
 * An audit failure must not turn a successful save into a failed one: the
 * audit log is a record, not the source of truth. The Supabase builder is a
 * thenable rather than a Promise, so it is awaited inside a try/catch rather
 * than given a `.catch()`.
 */
async function writeAudit(
  db: Awaited<ReturnType<typeof createSupabaseActionClient>>,
  action: string,
  entity: string,
  entityId: string,
  meta: Record<string, unknown> = {},
): Promise<void> {
  try {
    await db.rpc('write_audit', {
      p_action: action,
      p_entity: entity,
      p_entity_id: entityId,
      p_meta: meta as Json,
    })
  } catch (error) {
    console.error('[audit]', entity, error)
  }
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export async function upsertProductAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdminAction('จัดการสินค้า')

  const rawBinding = formData.get('binding')
  const parsed = productUpsertSchema.safeParse({
    id: formData.get('id') || undefined,
    productCode: formData.get('productCode'),
    name: formData.get('name'),
    gameId: formData.get('gameId'),
    priceThb: formData.get('priceThb'),
    priceLak: formData.get('priceLak'),
    priceAmount: formData.get('priceAmount'),
    currency: formData.get('currency') || undefined,
    rank: formData.get('rank') || undefined,
    heroCount: formData.get('heroCount') ?? 0,
    skinCount: formData.get('skinCount') ?? 0,
    binding: rawBinding === 'bound' || rawBinding === 'unbound' ? rawBinding : undefined,
    description: formData.get('description') || undefined,
    status: formData.get('status') || 'available',
    isVisible: formData.get('isVisible') === 'on' || formData.get('isVisible') === 'true',
    featuredAt: formData.get('featuredAt') || null,
  })

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง')
  }

  const input = parsed.data

  // Resolve dual-currency prices without any automatic exchange rate conversion.
  let priceThb = typeof input.priceThb === 'number' ? input.priceThb : null
  let priceLak = typeof input.priceLak === 'number' ? input.priceLak : null

  if (priceThb === null && priceLak === null && typeof input.priceAmount === 'number') {
    if (input.currency === 'LAK') {
      priceLak = input.priceAmount
    } else {
      priceThb = input.priceAmount
    }
  }

  if (priceThb === null && priceLak === null) {
    return fail('กรุณากรอกราคาอย่างน้อย 1 สกุลเงิน (THB หรือ LAK)')
  }

  const primaryCurrency: 'THB' | 'LAK' = priceThb !== null ? 'THB' : 'LAK'
  const primaryAmount: number = priceThb !== null ? priceThb : (priceLak as number)

  const db = await createSupabaseActionClient()

  const payload = {
    product_code: input.productCode.toUpperCase(),
    name: input.name,
    game_id: input.gameId,
    price_amount: primaryAmount,
    currency: primaryCurrency,
    price_thb: priceThb,
    price_lak: priceLak,
    rank: input.rank || null,
    hero_count: input.heroCount,
    skin_count: input.skinCount,
    binding: input.binding ?? null,
    description: input.description || null,
    status: input.status,
    is_visible: input.isVisible,
    featured_at: input.featuredAt ?? null,
  }

  const { error } = input.id
    ? await db.from('products').update(payload).eq('id', input.id)
    : await db.from('products').insert(payload)

  if (error) {
    if (error.code === '23505') {
      return fail('รหัสสินค้านี้ถูกใช้งานแล้ว กรุณาตั้งรหัสใหม่')
    }
    if (error.code === '42501') {
      return fail('คุณไม่มีสิทธิ์แก้ไขสินค้านี้')
    }
    // The raw database text is never returned: it can name tables and
    // columns that have no business on an administrator's screen.
    return fail('บันทึกสินค้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
  }

  await writeAudit(
    db,
    input.id ? 'update' : 'create',
    'product',
    input.productCode.toUpperCase(),
    payload as unknown as Record<string, unknown>,
  )

  invalidateProduct(input.productCode)
  return { ok: true }
}

export async function setProductStatusAction(
  productId: string,
  productCode: string,
  status: 'available' | 'reserved' | 'sold',
): Promise<ActionResult> {
  await requireAdminAction('จัดการสินค้า')

  const id = uuidSchema.safeParse(productId)
  if (!id.success) return fail('ข้อมูลไม่ถูกต้อง')

  const db = await createSupabaseActionClient()
  const { error } = await db.from('products').update({ status }).eq('id', id.data)
  if (error) return fail('เปลี่ยนสถานะไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')

  invalidateProduct(productCode)
  return { ok: true }
}

/**
 * Delete a product and its files.
 *
 * The storage objects are removed explicitly. The rows cascade on their own,
 * and an object with no row is unreachable: never served, never listed, never
 * deleted — the public bucket fills with orphans (C-15).
 */
export async function deleteProductAction(productId: string): Promise<ActionResult> {
  await requireAdminAction('จัดการสินค้า')

  const parsed = uuidSchema.safeParse(productId)
  if (!parsed.success) return fail('ข้อมูลไม่ถูกต้อง')

  const db = await createSupabaseActionClient()

  const { data: product } = await db
    .from('products')
    .select('product_code')
    .eq('id', parsed.data)
    .maybeSingle()

  const { data: images } = await db
    .from('product_images')
    .select('storage_path, full_path')
    .eq('product_id', parsed.data)

  const { error } = await db.from('products').delete().eq('id', parsed.data)
  if (error) return fail('ลบสินค้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')

  const keys = (images ?? []).flatMap((row) => [row.storage_path, row.full_path].filter(Boolean))
  if (keys.length > 0) {
    // Best effort. The row is already gone, and a storage failure here must
    // not be reported as a failed delete, because the product IS deleted.
    await db.storage
      .from(BUCKETS.product)
      .remove(keys as string[])
      .catch(() => null)
  }

  // The builder is a thenable rather than a Promise, so `.catch` is not on
  // it. Wrapping in an async function gives a real promise, and an audit
  // failure must never turn a successful save into a failure.
  await writeAudit(db, 'delete', 'product', product?.product_code ?? parsed.data, {
    removedObjects: keys.length,
  })

  if (product?.product_code) invalidateProduct(product.product_code)
  return { ok: true }
}

export async function checkProductCodeAction(
  code: string,
  ignoreId: string | null,
): Promise<{ available: boolean; message: string | null }> {
  await requireAdminAction('จัดการสินค้า')

  const normalized = code.trim().toUpperCase()
  if (!/^[A-Z0-9][A-Z0-9-]{1,31}$/.test(normalized)) {
    return {
      available: false,
      message: 'รหัสสินค้าต้องเป็นตัวอักษรตัวเลขและขีดกลางเท่านั้น',
    }
  }

  const db = await createSupabaseActionClient()
  let query = db.from('products').select('id').eq('product_code', normalized)
  if (ignoreId) query = query.neq('id', ignoreId)

  const { data, error } = await query.maybeSingle()
  if (error) return { available: false, message: 'ตรวจสอบรหัสไม่สำเร็จ' }

  return data
    ? { available: false, message: 'รหัสนี้ถูกใช้งานแล้ว' }
    : { available: true, message: null }
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

const uploadArgsSchema = z.object({
  productId: uuidSchema,
  productCode: z.string().regex(/^[A-Z0-9][A-Z0-9-]{1,31}$/i),
})

function thaiUploadError(error: unknown): string {
  if (error instanceof ImageValidationError) {
    switch (error.code) {
      case 'too_large':
        return 'ไฟล์ใหญ่เกิน 3.5 MB'
      case 'mime':
        return 'ชนิดไฟล์ไม่รองรับ'
      case 'pixels':
        return 'ไฟล์ภาพใหญ่เกินไป'
      case 'decode':
        return 'อ่านไฟล์ภาพไม่สำเร็จ'
    }
  }
  const message = error instanceof Error ? error.message : String(error)
  if (/row level security/i.test(message)) return 'ไม่มีสิทธิ์แก้ไขสินค้านี้'
  if (/413|too large/i.test(message)) return 'ไฟล์ใหญ่เกิน 3.5 MB'
  return 'อัปโหลดไม่สำเร็จ'
}

/**
 * Upload, resilient per file.
 *
 * The stem is minted once per file inside processUpload, so both variants
 * share a name and `full_path` is derivable from `storage_path` (C-15).
 *
 * A failing file must not take the successful ones with it: only that file's
 * own objects are removed, and the rows already inserted stay. The cover is
 * then set once, after the loop — calling it per file made the cover the last
 * file processed rather than the first.
 */
export async function uploadProductImages(
  _prev: { ok: boolean; error: string | null },
  formData: FormData,
): Promise<{ ok: boolean; error: string | null }> {
  await requireAdminAction('อัปโหลดรูปภาพ')

  const args = uploadArgsSchema.safeParse({
    productId: formData.get('productId'),
    productCode: formData.get('productCode'),
  })
  if (!args.success) return { ok: false, error: 'ข้อมูลไม่ถูกต้อง' }

  const files = formData
    .getAll('files')
    .filter((entry): entry is File => entry instanceof File && entry.size > 0)

  if (files.length === 0) return { ok: false, error: 'กรุณาเลือกไฟล์รูปภาพ' }
  if (files.length > MAX_FILES_PER_UPLOAD) {
    return { ok: false, error: `อัปโหลดได้สูงสุด ${MAX_FILES_PER_UPLOAD} รูปต่อครั้ง` }
  }

  const db = await createSupabaseActionClient()
  const errors: string[] = []
  const insertedIds: string[] = []

  for (const file of files) {
    // Only this file's objects, so a later failure cannot delete an earlier
    // success.
    const mine: string[] = []

    try {
      const processed = await processUpload(file, args.data.productId)

      const card = processed.find((image) => image.path.endsWith(`${CARD_SUFFIX}.webp`))
      const full = processed.find((image) => !image.path.endsWith(`${CARD_SUFFIX}.webp`))
      if (!card || !full) throw new ImageValidationError('decode', 'อ่านไฟล์ภาพไม่สำเร็จ')

      for (const image of processed) {
        const { error: uploadError } = await db.storage
          .from(BUCKETS.product)
          .upload(image.path, image.buffer, {
            contentType: 'image/webp',
            cacheControl: '31536000',
            upsert: true,
          })
        if (uploadError) throw uploadError
        // Recorded only after the upload succeeded, so the cleanup list never
        // names an object that does not exist.
        mine.push(image.path)
      }

      // Position is reserved inside the RPC under a row lock (C-16), so two
      // administrators uploading at once cannot claim the same slot.
      const { data: imageId, error: rpcError } = await db.rpc('append_product_images', {
        p_product_id: args.data.productId,
        p_row: {
          storage_path: card.path,
          full_path: full.path,
          width: card.width,
          height: card.height,
          alt: file.name.replace(/[.][a-z0-9]+$/i, '').slice(0, 120),
        },
      })

      if (rpcError) throw rpcError
      if (typeof imageId === 'string') insertedIds.push(imageId)
    } catch (error) {
      console.error('[upload]', file.name, error)
      if (mine.length > 0) {
        await db.storage.from(BUCKETS.product).remove(mine).catch(() => null)
      }
      errors.push(`${file.name}: ${thaiUploadError(error)}`)
    }
  }

  const firstInserted = insertedIds[0]
  if (firstInserted !== undefined) {
    const { error: coverError } = await db.rpc('set_product_cover', {
      p_product_id: args.data.productId,
      p_image_id: firstInserted,
    })
    if (coverError) {
      // The rows are inserted. Removing the objects now would leave rows
      // pointing at nothing, which is worse than a cover that did not move.
      console.error('[cover]', coverError)
    }
  }

  invalidateProduct(args.data.productCode)

  if (errors.length === 0) return { ok: true, error: null }
  return {
    ok: false,
    error: `อัปโหลดสำเร็จ ${files.length - errors.length} จาก ${files.length} ไฟล์ — ${errors[0]}`,
  }
}

export async function deleteProductImageAction(
  imageId: string,
  productId: string,
  productCode: string,
): Promise<ActionResult> {
  await requireAdminAction('จัดการรูปภาพ')

  const image = uuidSchema.safeParse(imageId)
  const product = uuidSchema.safeParse(productId)
  if (!image.success || !product.success) return fail('ข้อมูลไม่ถูกต้อง')

  const db = await createSupabaseActionClient()

  const { data: row } = await db
    .from('product_images')
    .select('storage_path, full_path')
    .eq('id', image.data)
    .maybeSingle()

  const { error } = await db.from('product_images').delete().eq('id', image.data)
  if (error) return fail('ลบรูปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')

  if (row) {
    await db.storage
      .from(BUCKETS.product)
      .remove([row.storage_path, row.full_path].filter(Boolean) as string[])
      .catch(() => null)
  }

  invalidateProduct(productCode)
  return { ok: true }
}

export async function setProductCoverAction(
  productId: string,
  imageId: string,
  productCode: string,
): Promise<ActionResult> {
  await requireAdminAction('จัดการรูปภาพ')

  const product = uuidSchema.safeParse(productId)
  const image = uuidSchema.safeParse(imageId)
  if (!product.success || !image.success) return fail('ข้อมูลไม่ถูกต้อง')

  const db = await createSupabaseActionClient()
  const { error } = await db.rpc('set_product_cover', {
    p_product_id: product.data,
    p_image_id: image.data,
  })
  if (error) return fail('ตั้งเป็นภาพปกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')

  invalidateProduct(productCode)
  return { ok: true }
}

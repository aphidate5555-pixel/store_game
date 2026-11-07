'use server'

import { z } from 'zod'

import { requireAdminAction } from '@/lib/auth/require-admin'
import { createSupabaseActionClient } from '@/lib/supabase/action'
import { invalidateCatalog } from '@/lib/cache/tags'
import { isAllowedBrandMime, MAX_IMAGE_BYTES_LABEL } from '@/lib/images/limits'
import { BUCKETS } from '@/lib/storage/buckets'
import { buildBrandPath } from '@/lib/storage/storage-paths'
import type { Json } from '@/lib/database.types'

/**
 * Game category actions.
 *
 * The delete rule is the interesting one: a category holding products cannot
 * be deleted, because the alternative — hiding its products automatically —
 * would remove items from the storefront without anyone deciding to. The
 * action refuses and tells the administrator to move them first.
 */

export type CategoryResult =
  | { ok: true }
  | { ok: false; code: 'error'; message: string }
  | {
      ok: false
      code: 'delete_blocked'
      message: string
      count: number
      products: { id: string; name: string; product_code: string }[]
    }

const uuidSchema = z.string().uuid()

const categorySchema = z.object({
  id: uuidSchema.optional(),
  name: z.string().trim().min(1, 'กรุณากรอกชื่อหมวดหมู่').max(80, 'ชื่อหมวดหมู่ยาวเกินไป'),
  slug: z
    .string()
    .trim()
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      'URL หมวดหมู่ต้องเป็นตัวอักษรอังกฤษตัวเล็ก ตัวเลข และขีดกลางเท่านั้น เช่น mobile-legends',
    )
    .max(80),
  description: z.string().trim().max(500, 'รายละเอียดยาวเกินไป').optional(),
  is_enabled: z.coerce.boolean().default(true),
  position: z.coerce.number().int().min(0).max(9999).default(0),
})

export async function upsertCategoryAction(
  _prev: CategoryResult | null,
  formData: FormData,
): Promise<CategoryResult> {
  await requireAdminAction('จัดการหมวดหมู่เกม')

  const parsed = categorySchema.safeParse({
    id: formData.get('id') || undefined,
    name: formData.get('name'),
    slug: formData.get('slug'),
    description: formData.get('description') || undefined,
    is_enabled: formData.get('is_enabled') === 'on' || formData.get('is_enabled') === 'true',
    position: formData.get('position') ?? 0,
  })

  if (!parsed.success) {
    return { ok: false, code: 'error', message: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' }
  }

  const input = parsed.data
  const db = await createSupabaseActionClient()

  let uploadedImagePath: string | undefined
  let oldImagePath: string | null = null
  const imageFile = formData.get('image')

  if (imageFile instanceof File && imageFile.size > 0) {
    if (!isAllowedBrandMime(imageFile.type)) {
      return { ok: false, code: 'error', message: 'รองรับเฉพาะไฟล์รูป JPG, PNG หรือ WebP' }
    }
    if (imageFile.size > 3_500_000) {
      return { ok: false, code: 'error', message: `ไฟล์รูปใหญ่เกิน ${MAX_IMAGE_BYTES_LABEL}` }
    }

    if (input.id) {
      const { data: existing } = await db
        .from('games')
        .select('image_path')
        .eq('id', input.id)
        .maybeSingle()
      oldImagePath = existing?.image_path ?? null
    }

    const path = buildBrandPath('category')
    const buffer = Buffer.from(await imageFile.arrayBuffer())
    const { error: uploadError } = await db.storage.from(BUCKETS.brand).upload(path, buffer, {
      contentType: imageFile.type,
      cacheControl: '31536000',
      upsert: true,
    })
    if (uploadError) {
      return { ok: false, code: 'error', message: 'อัปโหลดรูปปกหมวดหมู่ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }
    }
    uploadedImagePath = path
  }

  const payload = {
    name: input.name,
    slug: input.slug,
    description: input.description || null,
    is_enabled: input.is_enabled,
    position: input.position,
    ...(uploadedImagePath ? { image_path: uploadedImagePath } : {}),
  }

  const { error } = input.id
    ? await db.from('games').update(payload).eq('id', input.id)
    : await db.from('games').insert(payload)

  if (error) {
    if (uploadedImagePath) {
      await db.storage.from(BUCKETS.brand).remove([uploadedImagePath]).catch(() => null)
    }
    if (error.code === '23505') {
      return { ok: false, code: 'error', message: 'หมวดหมู่นี้มี URL ชนกับหมวดหมู่อื่น' }
    }
    if (error.code === '42501') {
      return { ok: false, code: 'error', message: 'คุณไม่มีสิทธิ์จัดการหมวดหมู่' }
    }
    return { ok: false, code: 'error', message: 'บันทึกหมวดหมู่ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }
  }

  if (oldImagePath && uploadedImagePath) {
    await db.storage.from(BUCKETS.brand).remove([oldImagePath]).catch(() => null)
  }

  await audit(db, input.id ? 'update' : 'create', input.slug, payload)
  invalidateCatalog()
  return { ok: true }
}

export async function removeCategoryImageAction(id: string): Promise<CategoryResult> {
  await requireAdminAction('จัดการหมวดหมู่เกม')

  const parsed = uuidSchema.safeParse(id)
  if (!parsed.success) return { ok: false, code: 'error', message: 'ข้อมูลไม่ถูกต้อง' }

  const db = await createSupabaseActionClient()
  const { data: existing } = await db
    .from('games')
    .select('image_path, slug')
    .eq('id', parsed.data)
    .maybeSingle()

  const { error } = await db
    .from('games')
    .update({ image_path: null })
    .eq('id', parsed.data)

  if (error) {
    return { ok: false, code: 'error', message: 'ลบรูปปกหมวดหมู่ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }
  }

  if (existing?.image_path) {
    await db.storage.from(BUCKETS.brand).remove([existing.image_path]).catch(() => null)
  }

  await audit(db, 'remove_image', existing?.slug ?? parsed.data, {})
  invalidateCatalog()
  return { ok: true }
}

export async function setCategoryEnabledAction(
  id: string,
  isEnabled: boolean,
): Promise<CategoryResult> {
  await requireAdminAction('จัดการหมวดหมู่เกม')

  const parsed = uuidSchema.safeParse(id)
  if (!parsed.success) return { ok: false, code: 'error', message: 'ข้อมูลไม่ถูกต้อง' }

  const db = await createSupabaseActionClient()
  const { error } = await db.from('games').update({ is_enabled: isEnabled }).eq('id', parsed.data)
  if (error) return { ok: false, code: 'error', message: 'เปลี่ยนสถานะไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }

  invalidateCatalog()
  return { ok: true }
}

export async function deleteCategoryAction(id: string): Promise<CategoryResult> {
  await requireAdminAction('จัดการหมวดหมู่เกม')

  const parsed = uuidSchema.safeParse(id)
  if (!parsed.success) return { ok: false, code: 'error', message: 'ข้อมูลไม่ถูกต้อง' }

  const db = await createSupabaseActionClient()

  // ON DELETE RESTRICT would reject this anyway, but doing it here produces a
  // message the administrator can act on instead of a foreign-key error.
  const { data: products } = await db
    .from('products')
    .select('id, name, product_code')
    .eq('game_id', parsed.data)
    .limit(50)

  if (products && products.length > 0) {
    return {
      ok: false,
      code: 'delete_blocked',
      count: products.length,
      products,
      message: `ยังลบไม่ได้ หมวดหมู่นี้ยังมีสินค้า ${products.length} รายการ กรุณาย้ายสินค้าออกให้หมดก่อน`,
    }
  }

  const { error } = await db.from('games').delete().eq('id', parsed.data)
  if (error) {
    if (error.code === '23503') {
      return { ok: false, code: 'error', message: 'ยังลบไม่ได้ หมวดหมู่นี้ยังมีสินค้าอยู่' }
    }
    return { ok: false, code: 'error', message: 'ลบหมวดหมู่ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }
  }

  await audit(db, 'delete', parsed.data, {})
  invalidateCatalog()
  return { ok: true }
}

/**
 * Move every product of one category to another, in a single transaction.
 *
 * The RPC is the only way this is safe: doing it as a loop of updates would
 * leave the category half-empty if one update failed, and the storefront
 * would show a partial move.
 */
export async function bulkMoveProductsAction(
  fromGameId: string,
  toGameId: string,
): Promise<CategoryResult> {
  await requireAdminAction('ย้ายสินค้าระหว่างหมวดหมู่')

  const from = uuidSchema.safeParse(fromGameId)
  const to = uuidSchema.safeParse(toGameId)
  if (!from.success || !to.success) return { ok: false, code: 'error', message: 'ข้อมูลไม่ถูกต้อง' }
  if (from.data === to.data) return { ok: false, code: 'error', message: 'กรุณาเลือกหมวดหมู่ปลายทางที่ต่างจากเดิม' }

  const db = await createSupabaseActionClient()

  const { error } = await db
    .from('products')
    .update({ game_id: to.data })
    .eq('game_id', from.data)

  if (error) {
    if (error.code === '42501') return { ok: false, code: 'error', message: 'คุณไม่มีสิทธิ์ย้ายสินค้า' }
    return { ok: false, code: 'error', message: 'ย้ายสินค้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }
  }

  await audit(db, 'bulk_move', from.data, { to: to.data })
  invalidateCatalog()
  return { ok: true }
}

export async function reorderCategoriesAction(orderedIds: string[]): Promise<CategoryResult> {
  await requireAdminAction('จัดลำดับหมวดหมู่เกม')

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return { ok: false, code: 'error', message: 'ข้อมูลไม่ถูกต้อง' }
  }
  if (orderedIds.some((id) => !uuidSchema.safeParse(id).success)) {
    return { ok: false, code: 'error', message: 'ข้อมูลไม่ถูกต้อง' }
  }

  const db = await createSupabaseActionClient()

  for (const [index, id] of orderedIds.entries()) {
    const { error } = await db.from('games').update({ position: index + 1 }).eq('id', id)
    if (error) return { ok: false, code: 'error', message: 'จัดลำดับไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }
  }

  invalidateCatalog()
  return { ok: true }
}

async function audit(
  db: Awaited<ReturnType<typeof createSupabaseActionClient>>,
  action: string,
  entityId: string,
  meta: Record<string, unknown>,
): Promise<void> {
  try {
    await db.rpc('write_audit', {
      p_action: action,
      p_entity: 'game',
      p_entity_id: entityId,
      p_meta: meta as Json,
    })
  } catch (error) {
    console.error('[audit]', entityId, error)
  }
}

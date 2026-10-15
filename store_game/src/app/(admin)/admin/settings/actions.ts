'use server'

import { z } from 'zod'

import { requireAdminAction } from '@/lib/auth/require-admin'
import { createSupabaseActionClient } from '@/lib/supabase/action'
import { invalidateSiteConfig } from '@/lib/cache/tags'
import { safeExternal } from '@/lib/validation/url'
import { isHexColor } from '@/lib/settings/theme'
import { isAllowedBrandMime, MAX_IMAGE_BYTES_LABEL } from '@/lib/images/limits'
import { BUCKETS } from '@/lib/storage/buckets'
import { buildBrandPath } from '@/lib/storage/storage-paths'
import type { Json } from '@/lib/database.types'

/**
 * Store settings actions.
 *
 * Every write is field-scoped and version-checked (C-36): a partial update
 * means saving the WhatsApp number from one page cannot roll back the colour
 * another administrator just set, and the version check means a second save
 * from a stale form is reported rather than silently overwriting.
 */

export type SettingsResult =
  | { ok: true; version: number }
  | { ok: false; message: string }

const WHATSAPP = /^[0-9]{8,15}$/

/**
 * Only the columns a given card owns are accepted. A patch carrying any other
 * key is rejected outright rather than filtered, because a filtered patch
 * that silently drops a field looks to the administrator like a successful
 * save of something that was not saved.
 */
const CARD_COLUMNS = {
  branding: ['logo_path', 'favicon_path', 'default_og_image_path', 'primary_color', 'accent_color'],
  store: ['store_name', 'store_description', 'seo_title', 'seo_description'],
  contact: ['whatsapp_number', 'business_hours'],
  social: ['facebook_url', 'tiktok_url', 'instagram_url'],
  floating: ['floating_whatsapp_enabled', 'floating_whatsapp_text'],
  footer: ['footer_text', 'footer_disclaimer'],
  maintenance: ['maintenance_mode', 'maintenance_message'],
  seo: ['default_currency'],
} as const

export type CardKey = keyof typeof CARD_COLUMNS

const cardSchema = z.enum([
  'branding',
  'store',
  'contact',
  'social',
  'floating',
  'footer',
  'maintenance',
  'seo',
])

async function writeAudit(
  db: Awaited<ReturnType<typeof createSupabaseActionClient>>,
  card: string,
  meta: Record<string, unknown>,
): Promise<void> {
  try {
    await db.rpc('write_audit', {
      p_action: 'update',
      p_entity: 'store_settings',
      p_entity_id: card,
      p_meta: meta as Json,
    })
  } catch (error) {
    console.error('[audit]', card, error)
  }
}

type SettingsRow = Awaited<
  ReturnType<typeof createSupabaseActionClient>
> extends never
  ? never
  : import('@/lib/database.types').Database['public']['Tables']['store_settings']['Row']

export async function saveSettingsCard(input: {
  card: CardKey
  patch: Record<string, unknown>
  expectedVersion: number
}): Promise<SettingsResult> {
  await requireAdminAction('ตั้งค่าร้าน')

  const card = cardSchema.safeParse(input.card)
  if (!card.success) return { ok: false, message: 'ข้อมูลไม่ถูกต้อง' }

  const allowed: readonly string[] = CARD_COLUMNS[card.data]
  const patch: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(input.patch ?? {})) {
    if (!allowed.includes(key)) {
      return {
        ok: false,
        message: 'พบข้อมูลที่ไม่ควรอยู่ในการ์ดนี้ กรุณาลองใหม่',
      }
    }
    patch[key] = value
  }

  const problem = validatePatch(card.data, patch)
  if (problem) return { ok: false, message: problem }

  const db = await createSupabaseActionClient()

  const { data, error } = await db
    .from('store_settings')
    .update({ ...patch, version: input.expectedVersion + 1 })
    .eq('id', true)
    // C-36: the token is an integer, not a timestamp. Two saves inside the
    // same microsecond would both succeed with updated_at.
    .eq('version', input.expectedVersion)
    .select('version')
    .maybeSingle()

  if (error) {
    if (error.code === '42501') {
      return { ok: false, message: 'คุณไม่มีสิทธิ์เปลี่ยนแปลงการตั้งค่านี้' }
    }
    return { ok: false, message: 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }
  }

  if (data === null) {
    return {
      ok: false,
      message:
        'มีผู้ดูแลคนอื่นบันทึกค่านี้ไปก่อนแล้ว กรุณากดโหลดค่าล่าสุดแล้วลองอีกครั้ง',
    }
  }

  await writeAudit(db, card.data, patch)
  invalidateSiteConfig()
  return { ok: true, version: data.version }
}

/** Per-card validation, with the messages the form also shows. */
function validatePatch(card: CardKey, patch: Record<string, unknown>): string | null {
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue

    if (key === 'primary_color' || key === 'accent_color') {
      if (!isHexColor(value)) return 'รูปแบบสีไม่ถูกต้อง ต้องเป็น HEX 6 หลัก เช่น #E11D2E'
      continue
    }

    if (key === 'whatsapp_number') {
      if (value !== null && value !== '' && !WHATSAPP.test(String(value))) {
        return 'เบอร์ WhatsApp ต้องเป็นตัวเลข 8–15 หลัก และขึ้นต้นด้วยรหัสประเทศ (เช่น 66)'
      }
      continue
    }

    if (key === 'facebook_url' || key === 'tiktok_url' || key === 'instagram_url') {
      if (value === null || value === '') continue
      // The allowlist is applied again here, not only in the form: a value
      // that reaches the table becomes a link in the header of every page.
      if (safeExternal(String(value)) === null) {
        return 'ลิงก์ต้องเป็น https:// และต้องเป็นโดเมนที่อนุญาตของแพลตฟอร์มนั้น'
      }
      continue
    }

    if (key === 'floating_whatsapp_text' && String(value).length > 12) {
      return 'ข้อความบนปุ่มลอยต้องไม่เกิน 12 ตัวอักษร'
    }

    if (key === 'store_name' && String(value).length > 80) {
      return 'ชื่อร้านต้องยาวไม่เกิน 80 ตัวอักษร'
    }

    if (key === 'seo_title' && value !== null && String(value).length > 70) {
      return 'ชื่อหน้าในผลการค้นหาต้องยาวไม่เกิน 70 ตัวอักษร'
    }

    if (key === 'seo_description' && value !== null && String(value).length > 200) {
      return 'คำอธิบายในผลการค้นหาต้องยาวไม่เกิน 200 ตัวอักษร'
    }

    if (key === 'default_currency' && value !== 'THB' && value !== 'LAK') {
      return 'กรุณาเลือกสกุลเงิน'
    }
  }

  if (card === 'maintenance' && patch.maintenance_mode === true) {
    // Typed confirmation, because the switch takes the whole storefront
    // offline and there is no undo button on the public side.
    if (patch.maintenance_confirm !== 'MAINTENANCE') {
      return 'กรุณาพิมพ์คำว่า MAINTENANCE เพื่อยืนยัน'
    }
    delete patch.maintenance_confirm
  }

  return null
}

// ---------------------------------------------------------------------------
// Brand assets
// ---------------------------------------------------------------------------

const BRAND_KINDS = ['logo', 'favicon', 'og'] as const
type BrandKind = (typeof BRAND_KINDS)[number]

const brandAssetSchema = z.object({
  column: z.enum(['logo_path', 'favicon_path', 'default_og_image_path']),
  kind: z.enum(BRAND_KINDS),
  expectedVersion: z.number().int().min(0),
})

/**
 * Upload a brand asset.
 *
 * SVG and ICO are refused: SVG can carry script, and ImageResponse — which
 * renders the OG image — cannot decode either. The accepted set is the same
 * one the bucket enforces, so the two cannot disagree.
 */
export async function uploadBrandAssetAction(
  _prev: { ok: boolean; error: string | null },
  formData: FormData,
): Promise<{ ok: boolean; error: string | null }> {
  await requireAdminAction('อัปโหลดรูปแบรนด์')

  const args = brandAssetSchema.safeParse({
    column: formData.get('column'),
    kind: formData.get('kind'),
    expectedVersion: formData.get('expectedVersion') ? Number(formData.get('expectedVersion')) : undefined,
  })
  if (!args.success || args.data.expectedVersion === undefined) {
    return { ok: false, error: 'ข้อมูลไม่ถูกต้อง' }
  }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'กรุณาเลือกไฟล์รูปภาพ' }
  }
  if (!isAllowedBrandMime(file.type)) {
    return { ok: false, error: 'รองรับเฉพาะไฟล์ JPG, PNG หรือ WebP' }
  }
  if (file.size > 3_500_000) {
    return { ok: false, error: `ไฟล์รูปใหญ่เกิน ${MAX_IMAGE_BYTES_LABEL}` }
  }

  const db = await createSupabaseActionClient()

  // Remove the previous object only after the new one exists, so a failed
  // upload leaves the current logo in place.
  const { data: previous } = await db
    .from('store_settings')
    .select(args.data.column)
    .eq('id', true)
    .maybeSingle()

  const path = buildBrandPath(args.data.kind as BrandKind)
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await db.storage.from(BUCKETS.brand).upload(path, buffer, {
    contentType: file.type,
    cacheControl: '31536000',
    upsert: true,
  })
  if (uploadError) return { ok: false, error: 'อัปโหลดไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }

  const { data, error } = await db
    .from('store_settings')
    .update({ [args.data.column]: path, version: args.data.expectedVersion + 1 })
    .eq('id', true)
    .eq('version', args.data.expectedVersion)
    .select('version')
    .maybeSingle()

  if (error || data === null) {
    // The object is already stored. Leaving it would be an orphan, so it is
    // removed here rather than on the next successful save.
    await db.storage.from(BUCKETS.brand).remove([path]).catch(() => null)
    return {
      ok: false,
      error:
        error === null
          ? 'มีผู้ดูแลคนอื่นบันทึกค่านี้ไปก่อนแล้ว กรุณากดโหลดค่าล่าสุดแล้วลองอีกครั้ง'
          : 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
    }
  }

  const oldPath = (previous as Record<string, string | null> | null)?.[args.data.column]
  if (oldPath) {
    await db.storage.from(BUCKETS.brand).remove([oldPath]).catch(() => null)
  }

  await writeAudit(db, 'branding', { [args.data.column]: path })
  invalidateSiteConfig()
  return { ok: true, error: null }
}

export async function removeBrandAssetAction(
  column: 'logo_path' | 'favicon_path' | 'default_og_image_path',
  expectedVersion: number,
): Promise<SettingsResult> {
  await requireAdminAction('ลบรูปแบรนด์')

  const columnSchema = z.enum(['logo_path', 'favicon_path', 'default_og_image_path'])
  const parsed = columnSchema.safeParse(column)
  if (!parsed.success) return { ok: false, message: 'ข้อมูลไม่ถูกต้อง' }


  const db = await createSupabaseActionClient()

  const { data: previous } = await db
    .from('store_settings')
    .select(parsed.data)
    .eq('id', true)
    .maybeSingle()

  const { data, error } = await db
    .from('store_settings')
    .update({ [parsed.data]: null, version: expectedVersion + 1 })
    .eq('id', true)
    .eq('version', expectedVersion)
    .select('version')
    .maybeSingle()

  if (error || data === null) {
    return { ok: false, message: 'ลบรูปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }
  }


  const oldPath = (previous as Record<string, string | null> | null)?.[parsed.data]
  if (oldPath) {
    await db.storage.from(BUCKETS.brand).remove([oldPath]).catch(() => null)
  }

  await writeAudit(db, 'branding', { [parsed.data]: null })
  invalidateSiteConfig()
  return { ok: true, version: data.version }
}

export type { SettingsRow }

'use server'

import { z } from 'zod'

import { requireAdminAction } from '@/lib/auth/require-admin'
import { createSupabaseActionClient } from '@/lib/supabase/action'
import { invalidateSiteConfig } from '@/lib/cache/tags'
import { routeKeySchema } from '@/lib/validation/route-keys'
import { SECTION_KEYS, type SectionKey } from '@/lib/home/section-order'
import { SECTION_LIMITS } from '@/lib/i18n/th/defaults'
import type { Json } from '@/lib/database.types'

/**
 * Appearance actions.
 *
 * A section payload is merged, never replaced wholesale. A card that sends
 * only `{ enabled: false }` must not wipe the hero headline and the menu
 * items, which is what an upsert of the whole object did.
 */

export type AppearanceResult =
  | { ok: true }
  | { ok: false; message: string }

const sectionKeySchema = z.enum(SECTION_KEYS as unknown as [SectionKey, ...SectionKey[]])

const navItemSchema = z.object({
  label: z.string().trim().min(1, 'กรุณาใส่ข้อความเมนูอย่างน้อย 1 รายการ').max(24, 'ข้อความเมนูยาวเกินไป'),
  // F-13: a route key, never a typed href. A URL field here is how a menu
  // ends up pointing at a page that does not exist.
  route: routeKeySchema,
})

const sectionPatchSchema = z
  .object({
    enabled: z.boolean().optional(),

    hero: z
      .object({
        title: z.string().max(40, 'หัวเรื่องยาวเกินไป (สูงสุด 40 ตัวอักษร)').optional(),
        subtitle: z.string().max(120, 'คำอธิบายยาวเกินไป (สูงสุด 120 ตัวอักษร)').optional(),
        cta_text: z.string().max(30, 'ข้อความบนปุ่มยาวเกินไป (สูงสุด 30 ตัวอักษร)').optional(),
        cta_route: routeKeySchema.optional(),
        image_path: z.string().max(300).nullable().optional(),
      })
      .optional(),

    trust: z
      .object({
        count: z
          .number()
          .int()
          .min(SECTION_LIMITS.trustCount.min)
          .max(SECTION_LIMITS.trustCount.max)
          .optional(),
        items: z.array(z.string().max(60)).max(SECTION_LIMITS.trustItems.max).optional(),
      })
      .optional(),

    categories: z
      .object({
        limit: z
          .number()
          .int()
          .min(SECTION_LIMITS.categoriesLimit.min)
          .max(SECTION_LIMITS.categoriesLimit.max)
          .optional(),
      })
      .optional(),

    featured_products: z
      .object({
        title: z.string().max(60).optional(),
        count: z
          .number()
          .int()
          .min(SECTION_LIMITS.featuredCount.min)
          .max(SECTION_LIMITS.featuredCount.max)
          .optional(),
      })
      .optional(),

    all_products: z
      .object({
        per_page: z
          .number()
          .int()
          .min(SECTION_LIMITS.perPage.min)
          .max(SECTION_LIMITS.perPage.max)
          .optional(),
      })
      .optional(),

    navigation: z
      .object({
        show_search: z.boolean().optional(),
        show_whatsapp_button: z.boolean().optional(),
        items: z.array(navItemSchema).min(1).max(SECTION_LIMITS.navItems.max).optional(),
      })
      .optional(),

    footer: z
      .object({
        show_about: z.boolean().optional(),
        show_games: z.boolean().optional(),
        show_contact: z.boolean().optional(),
        show_social: z.boolean().optional(),
        show_disclaimer: z.boolean().optional(),
      })
      .optional(),
  })
  .partial()

export async function saveSectionAction(input: {
  sectionKey: string
  patch: unknown
}): Promise<AppearanceResult> {
  await requireAdminAction('ปรับแต่งหน้าเว็บ')

  const key = sectionKeySchema.safeParse(input.sectionKey)
  if (!key.success) return { ok: false, message: 'ส่วนนี้ไม่ถูกต้อง' }

  const patch = sectionPatchSchema.safeParse(input.patch)
  if (!patch.success) {
    return { ok: false, message: patch.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' }
  }

  const db = await createSupabaseActionClient()

  // Merge rather than replace, so a card that sends only one field does not
  // erase the rest of the section.
  const { data: existing } = await db
    .from('site_sections')
    .select('payload')
    .eq('section_key', key.data)
    .maybeSingle()

  const current = (existing?.payload ?? {}) as Record<string, unknown>
  const merged: Record<string, unknown> = { ...current, ...patch.data }

  // Numeric limits are clamped here as well as in the form: a value written
  // by an older build, or by a direct API call, must not be able to set
  // per_page to 5000.
  clampSectionNumbers(merged)

  const { error } = await db
    .from('site_sections')
    .upsert({ section_key: key.data, payload: merged as Json, updated_at: new Date().toISOString() })

  if (error) {
    if (error.code === '42501') {
      return { ok: false, message: 'คุณไม่มีสิทธิ์เปลี่ยนแปลงส่วนนี้' }
    }
    return { ok: false, message: 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }
  }

  try {
    await db.rpc('write_audit', {
      p_action: 'update',
      p_entity: 'site_section',
      p_entity_id: key.data,
      p_meta: patch.data as Json,
    })
  } catch (error) {
    console.error('[audit]', key.data, error)
  }

  invalidateSiteConfig()
  return { ok: true }
}

function clampSectionNumbers(payload: Record<string, unknown>): void {
  const clamp = (value: unknown, min: number, max: number): number =>
    Math.min(Math.max(typeof value === 'number' && Number.isFinite(value) ? value : min, min), max)

  const all = payload.all_products as Record<string, unknown> | undefined
  if (all && typeof all.per_page === 'number') {
    all.per_page = clamp(all.per_page, SECTION_LIMITS.perPage.min, SECTION_LIMITS.perPage.max)
  }

  const featured = payload.featured_products as Record<string, unknown> | undefined
  if (featured && typeof featured.count === 'number') {
    featured.count = clamp(
      featured.count,
      SECTION_LIMITS.featuredCount.min,
      SECTION_LIMITS.featuredCount.max,
    )
  }

  const categories = payload.categories as Record<string, unknown> | undefined
  if (categories && typeof categories.limit === 'number') {
    categories.limit = clamp(
      categories.limit,
      SECTION_LIMITS.categoriesLimit.min,
      SECTION_LIMITS.categoriesLimit.max,
    )
  }

  const trust = payload.trust as Record<string, unknown> | undefined
  if (trust && typeof trust.count === 'number') {
    trust.count = clamp(trust.count, SECTION_LIMITS.trustCount.min, SECTION_LIMITS.trustCount.max)
    if (Array.isArray(trust.items)) {
      trust.items = trust.items.slice(0, SECTION_LIMITS.trustItems.max)
    }
  }
}

/**
 * Section visibility.
 *
 * Kept as its own action rather than folded into saveSectionAction, because
 * the toggle is available on every card and must not require the form to be
 * in a valid state.
 */
export async function toggleSectionAction(
  sectionKey: string,
  isEnabled: boolean,
): Promise<AppearanceResult> {
  await requireAdminAction('เปิด-ปิดส่วนของหน้าเว็บ')

  const key = sectionKeySchema.safeParse(sectionKey)
  if (!key.success) return { ok: false, message: 'ส่วนนี้ไม่ถูกต้อง' }

  const db = await createSupabaseActionClient()

  const { data: existing } = await db
    .from('site_sections')
    .select('payload')
    .eq('section_key', key.data)
    .maybeSingle()

  const current = (existing?.payload ?? {}) as Record<string, unknown>
  const merged = { ...current, enabled: isEnabled }

  const { error } = await db
    .from('site_sections')
    .upsert({ section_key: key.data, payload: merged as Json, updated_at: new Date().toISOString() })

  if (error) return { ok: false, message: 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }

  invalidateSiteConfig()
  return { ok: true }
}

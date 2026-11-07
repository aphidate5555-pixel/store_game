import { z } from 'zod'

import { routeKeySchema } from './route-keys'
import { SECTION_LIMITS, SITE_DEFAULTS, TEXT_LIMITS } from '@/lib/i18n/th/defaults'
import type { SectionKey } from '@/lib/home/section-order'

/**
 * Validation for the section payloads.
 *
 * The same schema serves reads and writes, which is the point: a payload the
 * admin form cannot produce is also a payload the storefront will not try to
 * render.
 *
 * Unknown keys are stripped by Zod rather than merged in, so a hand-crafted
 * payload cannot inject structure the components do not expect (C-2).
 */
export const siteSectionSchema = z.object({
  enabled: z.boolean(),

  hero: z
    .object({
      title: z.string().max(TEXT_LIMITS.heroTitle),
      subtitle: z.string().max(TEXT_LIMITS.heroSubtitle),
      cta_text: z.string().max(TEXT_LIMITS.ctaText),
      // F-13: a route key from the registry, never a typed URL. There is no
      // cta_url field — a free-text destination is how a button ends up
      // pointing at a page that does not exist.
      cta_route: routeKeySchema,
      image_path: z.string().max(300).nullable(),
    })
    .partial(),

  trust: z
    .object({
      count: z.number().int().min(SECTION_LIMITS.trustCount.min).max(SECTION_LIMITS.trustCount.max),
      items: z.array(z.string().max(TEXT_LIMITS.trustItem)).max(SECTION_LIMITS.trustItems.max),
    })
    .partial(),

  categories: z
    .object({
      limit: z
        .number()
        .int()
        .min(SECTION_LIMITS.categoriesLimit.min)
        .max(SECTION_LIMITS.categoriesLimit.max),
    })
    .partial(),

  featured_products: z
    .object({
      title: z.string().max(TEXT_LIMITS.sectionTitle),
      count: z
        .number()
        .int()
        .min(SECTION_LIMITS.featuredCount.min)
        .max(SECTION_LIMITS.featuredCount.max),
    })
    .partial(),

  all_products: z
    .object({
      per_page: z
        .number()
        .int()
        .min(SECTION_LIMITS.perPage.min)
        .max(SECTION_LIMITS.perPage.max),
    })
    .partial(),

  navigation: z
    .object({
      show_search: z.boolean(),
      show_whatsapp_button: z.boolean(),
      items: z
        .array(
          z.object({
            label: z.string().trim().min(1).max(TEXT_LIMITS.navLabel),
            route: routeKeySchema,
          }),
        )
        .min(SECTION_LIMITS.navItems.min)
        .max(SECTION_LIMITS.navItems.max),
    })
    .partial(),

  footer: z
    .object({
      show_about: z.boolean(),
      show_games: z.boolean(),
      show_contact: z.boolean(),
      show_social: z.boolean(),
      show_disclaimer: z.boolean(),
    })
    .partial(),
})

export type SiteSectionPayload = z.infer<typeof siteSectionSchema>

export const SECTION_SHAPE: Record<SectionKey, z.ZodTypeAny> = {
  hero: siteSectionSchema.shape.hero ?? z.object({}),
  trust: siteSectionSchema.shape.trust ?? z.object({}),
  categories: siteSectionSchema.shape.categories ?? z.object({}),
  featured_products: siteSectionSchema.shape.featured_products ?? z.object({}),
  all_products: siteSectionSchema.shape.all_products ?? z.object({}),
  navigation: siteSectionSchema.shape.navigation ?? z.object({}),
  footer: siteSectionSchema.shape.footer ?? z.object({}),
}

/**
 * Validates a section patch (accepting either a flat section object like
 * `{ title, subtitle }` or a nested `{ hero: { title, subtitle } }` object).
 */
export function parseSectionPatch(
  key: SectionKey,
  patch: Record<string, unknown>,
): z.SafeParseReturnType<unknown, Record<string, unknown>> {
  const candidate =
    patch && typeof patch[key] === 'object' && patch[key] !== null && !Array.isArray(patch[key])
      ? (patch[key] as Record<string, unknown>)
      : patch
  return SECTION_SHAPE[key].safeParse(candidate) as z.SafeParseReturnType<
    unknown,
    Record<string, unknown>
  >
}

/**
 * Reads one section, falling back to the default when the stored payload does
 * not match the schema.
 *
 * It warns rather than throws. A malformed payload is data that drifted, not
 * a reason to take the storefront down, and the default is always renderable.
 */
export function readSection<K extends SectionKey>(key: K, raw: unknown): SiteDefaultsFor<K> {
  const defaults = SITE_DEFAULTS[key] as SiteDefaultsFor<K>
  const parsed = SECTION_SHAPE[key].safeParse(raw ?? {})

  if (!parsed.success) {
    console.warn('[site-sections] payload ไม่ถูกต้องสำหรับ', key, parsed.error.issues)
    return defaults
  }

  return { ...defaults, ...(parsed.data as object) } as SiteDefaultsFor<K>
}

export type SiteDefaultsFor<K extends SectionKey> = (typeof SITE_DEFAULTS)[K]

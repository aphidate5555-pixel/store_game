/**
 * The fixed order of homepage sections.
 *
 * `site_sections` deliberately has no order_index column: the order is a
 * product decision, not administrator data, so it lives in one constant
 * rather than in a column that two administrators could disagree about.
 */
export const HOME_SECTION_ORDER = [
  'hero',
  'trust',
  'categories',
  'featured_products',
  'all_products',
  'navigation',
  'footer',
] as const

export type SectionKey = (typeof HOME_SECTION_ORDER)[number]

export const SECTION_KEYS: readonly SectionKey[] = HOME_SECTION_ORDER

export const isSectionKey = (value: unknown): value is SectionKey =>
  typeof value === 'string' && (SECTION_KEYS as readonly string[]).includes(value)

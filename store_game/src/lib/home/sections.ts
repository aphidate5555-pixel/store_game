import { HOME_SECTION_ORDER, type SectionKey } from './section-order'

/**
 * Descriptions of the homepage sections, for the admin editor and for the
 * storefront's ordering.
 *
 * The order comes from HOME_SECTION_ORDER, not from the database: the
 * sequence is a product decision, and `site_sections` deliberately has no
 * order_index column (C-2). Making it data would mean two administrators
 * could disagree about the order and neither would be wrong.
 */
export interface SectionDescription {
  readonly id: SectionKey
  /** Key into the admin message map for the card heading. */
  readonly labelKey: string
  /** Whether the section can be turned off from the editor. */
  readonly toggleable: boolean
}

export const SECTIONS: readonly SectionDescription[] = HOME_SECTION_ORDER.map((id) => ({
  id,
  labelKey: `admin.appearance.section${id
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')}`,
  toggleable: true,
}))

export const sectionIds = (): SectionKey[] => [...HOME_SECTION_ORDER]

export const isSectionKey = (value: unknown): value is SectionKey =>
  typeof value === 'string' && (HOME_SECTION_ORDER as readonly string[]).includes(value)

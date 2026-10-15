import type { Database } from '@/lib/database.types'

/**
 * Pure helpers over catalogue rows.
 *
 * Deliberately separate from queries.ts: that module imports next/cache, and
 * importing it from a client component drags revalidatePath into the browser
 * bundle and fails the build. Nothing here touches the network or the cache,
 * so it is safe to import from either side.
 */

export type ProductRow = Database['public']['Tables']['products']['Row']
export type ProductImageRow = Database['public']['Tables']['product_images']['Row']
export type GameRow = Database['public']['Tables']['games']['Row']
export type SettingsRow = Database['public']['Tables']['store_settings']['Row']
export type SectionRow = Database['public']['Tables']['site_sections']['Row']

/**
 * The product cover (F-05).
 *
 * There is no cover column. The image at position 0 is the cover, and
 * nothing else in the schema duplicates that state — which is why a
 * product with images but no position-0 row renders a card with no picture,
 * rather than silently showing an arbitrary one.
 */
export function coverImage(
  images: readonly ProductImageRow[],
): ProductImageRow | null {
  for (const image of images) {
    if (image.position === 0) return image
  }
  return null
}

export interface GameCard {
  readonly id: string
  readonly slug: string
  readonly name: string
  readonly description: string | null
  readonly image_path: string | null
  readonly available_count: number
}

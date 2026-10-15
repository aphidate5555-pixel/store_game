import type { MetadataRoute } from 'next'

import {
  PRODUCT_SITEMAP_SIZE,
  countProducts,
  isMaintenanceActive,
  productSitemapPage,
  staticSitemap,
} from '@/lib/catalog/sitemap-data'

/**
 * The one and only sitemap for the site (C-8).
 *
 * Uses the file convention with generateSitemaps, which emits the xmlns
 * declarations and the index itself. A hand-written route handler cannot
 * produce a valid index, and having two owners of /sitemap.xml is how the
 * xmlns went missing in the first place.
 *
 * Ids are allocated as: 0 = static pages, 1..n = product pages. No id repeats
 * and no static URL appears in a product page (F-11).
 */
export const revalidate = 300

export async function generateSitemaps(): Promise<{ id: number }[]> {
  if (await isMaintenanceActive()) return []

  const total = await countProducts()
  const pageCount = Math.ceil(total / PRODUCT_SITEMAP_SIZE)

  const ids: { id: number }[] = [{ id: 0 }]
  for (let page = 1; page <= pageCount; page += 1) {
    ids.push({ id: page })
  }
  return ids
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  if (id === 0) return staticSitemap()
  return productSitemapPage(id)
}

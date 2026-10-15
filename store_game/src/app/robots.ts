import type { MetadataRoute } from 'next'

import { isMaintenanceActive } from '@/lib/catalog/sitemap-data'

/**
 * The one and only robots.txt (C-8).
 *
 * During maintenance the whole site is disallowed rather than merely stripped
 * of catalogue links: a crawler that cannot reach a page cannot be told the
 * page exists. The companion noindex signal is emitted as a meta tag by the
 * public layout, because a layout cannot set response headers (F-12).
 */
export const revalidate = 300

export default async function robots(): Promise<MetadataRoute.Robots> {
  if (await isMaintenanceActive()) {
    return { rules: [{ userAgent: '*', disallow: '/' }] }
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/', '/api/', '/auth/', '/concept/'],
      },
    ],
  }
}

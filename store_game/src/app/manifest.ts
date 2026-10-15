import type { MetadataRoute } from 'next'

import { fetchSiteConfig } from '@/lib/settings/query'
import { storeName } from '@/lib/catalog/seo'
import { isMaintenanceActive } from '@/lib/catalog/sitemap-data'

/**
 * Maintenance covers the manifest too (C-29): a web app manifest that still
 * advertises the storefront invites installs of a page that shows a
 * maintenance notice.
 */
export const revalidate = 300

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  if (await isMaintenanceActive()) {
    return {
      name: 'กำลังปรับปรุง',
      short_name: 'ปรับปรุง',
      start_url: '/',
      display: 'standalone',
      background_color: '#08080A',
      theme_color: '#E11D2E',
    }
  }

  const config = await fetchSiteConfig()
  const name = storeName(config.settings)

  return {
    name,
    short_name: name,
    description: config.settings.store_description || undefined,
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#08080A',
    theme_color: config.settings.primary_color || '#E11D2E',
    lang: 'th',
    dir: 'ltr',
  }
}

import 'server-only'

import type { MetadataRoute } from 'next'

import { getPublicDb } from '@/lib/supabase/public-client'
import { fetchSiteConfig } from '@/lib/settings/query'
import { SITE_URL } from './seo'
import type { Database } from '@/lib/database.types'

type ProductRow = Database['public']['Tables']['products']['Row']

/**
 * Sitemap data source.
 *
 * 5000 rows per request is a hard limit, so the result set is paginated
 * rather than truncated. Ordering by product_code — which carries a unique
 * constraint — is what makes the .range() window stable: two consecutive reads
 * of the same offset cannot skip or repeat a row the way ordering by a
 * non-unique column could when a product is edited mid-crawl.
 */
export const PRODUCT_SITEMAP_SIZE = 5000

/**
 * How many product pages the sitemap needs.
 *
 * Uses search_products rather than a counted PostgREST select, and the
 * reason is specific: a head/count query on `products` is evaluated by RLS
 * as a plain visitor with no filter, and the read policy requires a visible
 * product in an enabled game — so it answers 401 and takes the whole build
 * down while the sitemap is being collected.
 *
 * search_products already applies both conditions, so it agrees with what
 * the sitemap is about to emit. It also means one code path decides what is
 * public, instead of two that can disagree.
 */
export async function countProducts(): Promise<number> {
  const db = await getPublicDb('sitemap')

  let counted = 0
  const PAGE = 100
  for (;;) {
    const { data, error } = await db.rpc('search_products', {
      p_pattern: null,
      p_game_slug: null,
      p_status: null,
      p_currency: 'THB',
      p_min: null,
      p_max: null,
      p_sort: 'newest',
      p_limit: PAGE,
      p_offset: counted,
    })
    if (error) throw error

    const row = (
      data as { items: unknown[] | null; total: number | null }[] | null
    )?.[0]
    const items = row?.items ?? []
    const total = Number(row?.total ?? 0)

    // The total only comes back on the first page (C-22); later pages return
    // it for the window rather than the whole set.
    if (counted === 0) counted = total
    if (items.length < PAGE) break
    counted += items.length
    if (counted >= total) break
  }

  return counted
}

export async function productSitemapPage(id: number): Promise<MetadataRoute.Sitemap> {
  const from = Math.max(0, id - 1) * PRODUCT_SITEMAP_SIZE
  const db = await getPublicDb('sitemap')
  const { data, error } = await db
    .from('products')
    .select('product_code, updated_at, status')
    .eq('is_visible', true)
    .order('product_code', { ascending: true })
    .range(from, from + PRODUCT_SITEMAP_SIZE - 1)

  if (error) throw error

  const rows = (data ?? []) as Pick<ProductRow, 'product_code' | 'updated_at' | 'status'>[]

  return rows.map((row) => ({
    url: `${SITE_URL}/products/${row.product_code}`,
    lastModified: new Date(row.updated_at),
    changeFrequency: 'daily',
    // A sold product stays in the sitemap — it can come back — but is crawled
    // less often (C-9).
    priority: row.status === 'available' ? 0.7 : 0.4,
  }))
}

/** id 0 carries the static pages. Product pages occupy ids 1..n and never
 *  repeat a static URL, and no id is ever emitted twice (F-11). */
export async function staticSitemap(): Promise<MetadataRoute.Sitemap> {
  const db = await getPublicDb('sitemap')
  const { data, error } = await db
    .from('games')
    .select('slug, updated_at')
    .eq('is_enabled', true)
    .order('slug', { ascending: true })
  if (error) throw error

  const games = (data ?? []) as { slug: string; updated_at: string }[]

  return [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/products`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/games`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/contact`, changeFrequency: 'yearly', priority: 0.3 },
    ...games.map((game) => ({
      url: `${SITE_URL}/games/${game.slug}`,
      lastModified: new Date(game.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  ]
}

/**
 * During maintenance the sitemap is empty. Serving the catalogue through the
 * sitemap while the storefront shows a maintenance page would tell search
 * engines the pages exist and are worth crawling (C-29).
 */
export async function isMaintenanceActive(): Promise<boolean> {
  try {
    const config = await fetchSiteConfig()
    return config.maintenanceMode
  } catch {
    // Fail closed: if the site cannot be read, do not advertise its contents.
    return true
  }
}

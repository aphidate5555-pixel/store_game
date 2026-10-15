import { unstable_cache } from 'next/cache'

import { TAGS } from '@/lib/cache/tags'
import { getPublicDb, searchProducts } from '@/lib/supabase/public-client'
import {
  MAX_LIMIT,
  MAX_OFFSET,
  PAGE_SIZE,
  parseCatalogSearchParams,
  likePattern,
  type CatalogQueryInput,
  type RawSearchParams,
} from './search-params'
import type { Database } from '@/lib/database.types'

import type {
  GameCard,
  GameRow,
  ProductImageRow,
  ProductRow,
} from './product-utils'

// Re-exported so server modules can import everything from one place, while
// client components import the pure helpers from product-utils directly.
export { coverImage } from './product-utils'
export type { GameCard, GameRow, ProductImageRow, ProductRow } from './product-utils'

/**
 * Catalogue reads.
 *
 * Every read is wrapped in `unstable_cache` with tags drawn from `TAGS`
 * (C-7, F-02). The Supabase client only receives the anon key and is never
 * built from a user JWT, so anything cached here is identical for every
 * visitor. Queries that must see admin-only rows use the cookie-bound client
 * and are deliberately NOT cached — caching a function that calls cookies()
 * throws at build time and would leak one administrator's data to everyone.
 *
 * Note on `cache()` from React: it memoises within a single request only and
 * is NOT a persistent cache (F-15). Persistence comes from unstable_cache
 * plus the tag invalidation in src/lib/cache/tags.ts.
 */

export interface ProductListResult {
  readonly query: CatalogQueryInput
  readonly items: ProductRow[]
  readonly total: number
  readonly hasInvalid: boolean
  readonly invalidKeys: readonly string[]
  readonly page: number
  readonly pageSize: number
  readonly pageCount: number
}

async function runSearchProducts(
  query: CatalogQueryInput,
): Promise<{ items: ProductRow[]; total: number }> {
  const offset = (query.page - 1) * PAGE_SIZE

  // C-39: deep pagination is refused at the boundary rather than silently
  // returning an empty page that reads as "no products".
  if (offset > MAX_OFFSET) {
    return { items: [], total: 0 }
  }

  const db = await getPublicDb('catalog')
  return searchProducts(db, {
    p_pattern: query.q ? likePattern(query.q) : null,
    p_game_slug: query.game ?? null,
    p_status: query.status ?? null,
    p_currency: query.currency,
    p_min: query.min ?? null,
    p_max: query.max ?? null,
    p_sort: query.sort,
    p_limit: PAGE_SIZE,
    p_offset: offset,
  })
}

const cachedSearch = unstable_cache(
  async (serialized: string): Promise<{ items: ProductRow[]; total: number }> => {
    const query = JSON.parse(serialized) as CatalogQueryInput
    return runSearchProducts(query)
  },
  ['catalog-search'],
  { tags: [TAGS.catalog, TAGS.games], revalidate: 300 },
)

export async function getProductList(raw: RawSearchParams): Promise<ProductListResult> {
  const { data: query, hasInvalid, invalidKeys } = parseCatalogSearchParams(raw)
  const { items, total } = await cachedSearch(JSON.stringify(query))

  return {
    query,
    items,
    total,
    hasInvalid,
    invalidKeys,
    page: query.page,
    pageSize: Math.min(PAGE_SIZE, MAX_LIMIT),
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  }
}

export interface ProductDetail {
  readonly product: ProductRow
  readonly game: GameRow
  readonly images: ProductImageRow[]
  readonly related: ProductRow[]
}

interface ProductDetailPayload {
  product?: ProductRow
  game?: GameRow | GameRow[] | null
  images?: ProductImageRow[] | null
  related?: ProductRow[] | null
}

async function runProductDetail(code: string): Promise<ProductDetail | null> {
  const db = await getPublicDb('product')
  const { data, error } = await db.rpc('get_product_detail', { p_code: code })
  if (error) throw error

  const payload = data as ProductDetailPayload | null
  if (!payload?.product) return null

  // The FK is nullable in the generated type and a game can be disabled while
  // still referenced, so narrow honestly instead of casting null away.
  const rawGame = payload.game
  const game = Array.isArray(rawGame) ? rawGame[0] : rawGame
  if (!game) return null

  const images = [...(payload.images ?? [])].sort((a, b) => a.position - b.position)

  return {
    product: payload.product,
    game,
    images,
    related: payload.related ?? [],
  }
}

const cachedDetail = unstable_cache(
  async (code: string): Promise<ProductDetail | null> => runProductDetail(code),
  ['product-detail'],
  { tags: [TAGS.catalog, TAGS.games, TAGS.featured], revalidate: 300 },
)

/** For the page body. Throws on a transport failure so the error boundary
 *  reports a real error instead of a misleading 404 (C-41). */
export async function getProductDetailForBody(code: string): Promise<ProductDetail | null> {
  return cachedDetail(code.toUpperCase())
}

/** For generateMetadata. A failure here must not take the page down, so the
 *  error is swallowed and only a genuine "no such product" returns null. */
export async function getProductDetailForMeta(code: string): Promise<ProductDetail | null> {
  try {
    return await cachedDetail(code.toUpperCase())
  } catch {
    return null
  }
}

/**
 * Product cover (F-05). There is no cover column: the image whose position is
 * 0 is the cover, and nothing else in the schema duplicates that state.
 */
const cachedGameCards = unstable_cache(
  async (limit: number): Promise<GameCard[]> => {
    const db = await getPublicDb('game')
    const { data, error } = await db.rpc('game_catalog_cards')
    if (error) throw error
    return ((data ?? []) as GameCard[]).slice(0, limit)
  },
  ['game-cards'],
  { tags: [TAGS.games, TAGS.catalog], revalidate: 300 },
)

export const getGameCards = (limit = 8): Promise<GameCard[]> => cachedGameCards(limit)

export interface HomeData {
  readonly sections: Database['public']['Tables']['site_sections']['Row'][]
  readonly games: GameCard[]
  readonly featured: ProductRow[]
  readonly latest: ProductRow[]
}

const cachedHome = unstable_cache(
  async (): Promise<HomeData> => {
    const db = await getPublicDb('site')

    const [shell, cards, products] = await Promise.all([
      db.rpc('get_site_shell'),
      db.rpc('game_catalog_cards'),
      searchProducts(db, {
        p_pattern: null,
        p_game_slug: null,
        p_status: null,
        p_currency: 'THB',
        p_min: null,
        p_max: null,
        p_sort: 'newest',
        p_limit: 16,
        p_offset: 0,
      }),
    ])

    if (shell.error) throw shell.error
    if (cards.error) throw cards.error

    const shellRow = shell.data as
      | { settings?: unknown; sections?: Database['public']['Tables']['site_sections']['Row'][] }
      | null

    return {
      sections: shellRow?.sections ?? [],
      games: (cards.data ?? []) as GameCard[],
      featured: products.items,
      latest: products.items,
    }
  },
  ['home-data'],
  {
    tags: [TAGS.settings, TAGS.sections, TAGS.games, TAGS.catalog, TAGS.featured],
    revalidate: 300,
  },
)

export const getHomeData = (): Promise<HomeData> => cachedHome()

/**
 * The appearance preview is an admin page. It pulls a deliberately small
 * sample so the payload never grows into "a hundred products in one RSC
 * flight" (a failure mode called out in the plan). It uses the same public
 * client and the same tags as the real site.
 */
export async function getPreviewCatalog(limit = 6): Promise<ProductRow[]> {
  const capped = Math.min(Math.max(limit, 1), 6)
  const db = await getPublicDb('catalog')
  const { items } = await searchProducts(db, {
    p_pattern: null,
    p_game_slug: null,
    p_status: null,
    p_currency: 'THB',
    p_min: null,
    p_max: null,
    p_sort: 'newest',
    p_limit: capped,
    p_offset: 0,
  })
  return items
}

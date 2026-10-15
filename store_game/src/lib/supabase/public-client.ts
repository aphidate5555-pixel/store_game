import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { getEnv } from '@/lib/env/schema'
import type { Database } from '@/lib/database.types'
import { TAGS } from '@/lib/cache/tags'

/**
 * The anonymous client for every public catalog read (§2.2 rule 2).
 *
 * This client is created with the anon key and **no user JWT**. It must never
 * receive one: a public page that ran with a visitor's token could read
 * anything that visitor's RLS policy allows, and `unstable_cache` would then
 * serve that result to everyone else.
 *
 * -------------------------------------------------------------------
 * Caching — read this before writing a query (F-02, F-15)
 * -------------------------------------------------------------------
 * The `fetch` wrapper below declares the cache tags that the Next.js data
 * cache associates with the request. That declaration is *necessary but not
 * sufficient*. In Next.js 15.5 `fetch` defaults to `cache: 'no-store'`, so a
 * tagged request is not by itself a cached one, and nothing in this file
 * makes it cached.
 *
 * The persistent layer is `unstable_cache` plus `TAGS`, and it lives in
 * `src/lib/catalog/queries.ts` — not here. This module only:
 *   1. creates one anonymous client for a read family, and
 *   2. attaches the family's tags to every request that client makes.
 *
 * `tests/unit/cache-tags.test.ts` is what proves the pairing; this file makes
 * no caching claim beyond it.
 * -------------------------------------------------------------------
 * Cookie-bound reads must never go through this client: there would be no user
 * JWT to read with, and caching the result would leak one visitor's data into
 * another's page (rule 5 of §5). Those use `createServerClient()`.
 *
 * A client is created per call rather than memoised. `unstable_cache` callbacks
 * run outside the request scope, so a module-level singleton would be shared
 * across concurrent requests — cheap to avoid, and it removes the "which user
 * is this client holding" question entirely.
 */

/**
 * The read families the public site has, each with the tags that describe its
 * invalidation (C-7). Every tag value comes from `TAGS`; a literal tag string
 * appears nowhere outside `src/lib/cache/tags.ts`.
 */
const SCOPE_TAGS = {
  /** `/products`, `/games`, the catalog facets and the featured shelf. */
  catalog: [TAGS.catalog, TAGS.games],
  /** `get_site_shell()` — settings and section payloads for the layout. */
  site: [TAGS.settings, TAGS.sections, TAGS.games],
  /** `get_product_detail()` — one product plus its owning game. */
  product: [TAGS.catalog, TAGS.games],
  /** `game_catalog_cards()` — the game rail. */
  game: [TAGS.games, TAGS.catalog],
  /** `src/app/sitemap.ts` — paginated product codes. */
  sitemap: [TAGS.catalog],
} as const satisfies Record<string, readonly string[]>

export type PublicDbScope = keyof typeof SCOPE_TAGS

/**
 * Wraps `fetch` so every PostgREST request made by the returned client carries
 * the tags of its read family.
 *
 * Existing tags are merged rather than replaced, so a caller that adds
 * `TAGS.product(code)` on top keeps the family tags as well.
 */
function createTaggedFetch(scope: PublicDbScope): typeof fetch {
  const familyTags: readonly string[] = SCOPE_TAGS[scope]

  return async (input, init) => {
    const existing = init?.next
    const tags = Array.from(new Set([...(existing?.tags ?? []), ...familyTags]))
    return fetch(input, { ...init, next: { ...existing, tags } })
  }
}

/**
 * Creates the anonymous client for one public read.
 *
 * `scope` selects the tag declaration only. It never widens what the RLS
 * policies allow, because the request still carries just the anon key.
 */
export async function getPublicDb(scope: PublicDbScope): Promise<SupabaseClient<Database>> {
  const env = getEnv()

  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    // No session is persisted and none is detected from the URL, so the only
    // JWT this client can ever carry is the anon key.
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: { fetch: createTaggedFetch(scope) },
  })
}

/**
 * The flat `{ items, total }` pair returned by `search_products` (F-01).
 */
export interface SearchProductsResult {
  items: Database['public']['Tables']['products']['Row'][]
  total: number
}

/**
 * Calls `search_products` and flattens its one-row table result (F-01).
 *
 * The wire shape is a single-element array because the function is declared
 * `RETURNS TABLE(items products[], total bigint)`. Ten call sites reading
 * `data[0].items` is how one of them ends up rendering a NaN page count.
 *
 * `total` comes from `count(*) over ()`, which is evaluated over the paginated
 * rows, so it is only trustworthy when `p_offset` is 0 — the first page (C-22).
 */
export async function searchProducts(
  db: SupabaseClient<Database>,
  args: Database['public']['Functions']['search_products']['Args'],
): Promise<SearchProductsResult> {
  const { data, error } = await db.rpc('search_products', args)
  if (error) throw new Error(`อ่านรายการสินค้าไม่สำเร็จ: ${error.message}`)

  const row = data?.[0]
  return { items: row?.items ?? [], total: row?.total ?? 0 }
}

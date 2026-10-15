import { TAGS } from '@/lib/cache/tags'

/**
 * The tags whose reads and writes must agree.
 *
 * A read that omits one of these is invisible to the corresponding write, and
 * a write that omits one leaves a stale entry. Keeping the list in one place
 * lets cache-tags.test.ts assert both directions without hard-coding the
 * taxonomy a second time.
 */
export const ALL_CATALOG_TAGS = ['catalog', 'games', 'featured'] as const

/** Reads that must never be cached: they depend on the caller's session. */
export const COOKIE_BOUND_HINTS = ['createServerClient', 'createSupabaseActionClient']

export { TAGS }

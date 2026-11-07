import { z } from 'zod'

/**
 * Catalog query contract.
 *
 * Two decisions shape this file:
 *
 * 1. Currency is a mandatory facet, not an optional filter (C-12 context).
 *    The catalogue mixes THB and LAK with no conversion table, so sorting or
 *    filtering by price across currencies is meaningless. Every price facet
 *    and every price sort is therefore always scoped to one currency.
 *
 * 2. Validation is per key (C-39). The previous implementation validated the
 *    whole object at once and fell back to defaults when any single key was
 *    malformed, which silently produced a page that looked identical to the
 *    unfiltered one — a duplicate indexable URL for /products. Here a bad
 *    `min` is dropped on its own and reported through `hasInvalid`, and the
 *    page then serves `noindex, follow` (C-39).
 */
export const SORT_KEYS = ['newest', 'oldest', 'price_asc', 'price_desc'] as const
export const CURRENCIES = ['THB', 'LAK'] as const

export type SortKey = (typeof SORT_KEYS)[number]
export type CatalogCurrency = (typeof CURRENCIES)[number]

export const PAGE_SIZE = 24
/** Hard ceiling enforced again inside search_products(). */
export const MAX_LIMIT = 100
/** Deep pagination guard, checked at the action layer. */
export const MAX_OFFSET = 10_000

const SLUG = /^[a-z0-9-]{1,80}$/

export const catalogQueryShape = {
  q: z.string().trim().max(120).optional(),
  game: z.string().regex(SLUG).optional(),
  status: z.enum(['available', 'reserved', 'sold']).optional(),
  currency: z.enum(CURRENCIES).default('THB'),
  min: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
  max: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
  sort: z.enum(SORT_KEYS).default('newest'),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
} as const

export const CatalogQuery = z
  .object(catalogQueryShape)
  .refine((value) => value.min === undefined || value.max === undefined || value.min <= value.max, {
    message: 'min must be <= max',
    path: ['min'],
  })

export type CatalogQueryInput = z.infer<typeof CatalogQuery>
export type RawSearchParams = Record<string, string | string[] | undefined>

function firstValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
}

export function flattenSearchParams(raw: RawSearchParams): Record<string, string> {
  const flat: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw)) {
    const single = firstValue(value)
    if (single !== undefined) flat[key] = single
  }
  return flat
}

export interface ParsedCatalogQuery {
  readonly data: CatalogQueryInput
  readonly hasInvalid: boolean
  readonly invalidKeys: readonly string[]
}

/**
 * Validates each key independently. A key that fails is dropped and recorded;
 * the remaining keys still apply, so /products?currency=LAK&min=abc keeps the
 * currency facet and is merely marked noindex.
 */
export function parseCatalogSearchParams(raw: RawSearchParams): ParsedCatalogQuery {
  const flat = flattenSearchParams(raw)
  const accepted: Record<string, unknown> = {}
  const invalidKeys: string[] = []

  for (const [key, value] of Object.entries(flat)) {
    const schema = catalogQueryShape[key as keyof typeof catalogQueryShape]
    if (!schema) continue // unknown keys are ignored, not fatal
    const result = schema.safeParse(value)
    if (result.success) {
      accepted[key] = result.data
    } else {
      invalidKeys.push(key)
    }
  }

  const refined = CatalogQuery.safeParse(accepted)
  if (!refined.success) {
    // Only the min<=max refinement can fail at this point, because every key
    // already passed its own schema. Dropping just the offending bound keeps
    // the rest of the query usable.
    const relaxed: Record<string, unknown> = { ...accepted }
    const hadMin = relaxed.min !== undefined
    const hadMax = relaxed.max !== undefined
    delete relaxed.min
    delete relaxed.max
    if (hadMin || hadMax) invalidKeys.push('min')
    return {
      data: CatalogQuery.parse(relaxed),
      hasInvalid: invalidKeys.length > 0,
      invalidKeys,
    }
  }

  return {
    data: refined.data,
    hasInvalid: invalidKeys.length > 0,
    invalidKeys,
  }
}

/**
 * Escapes LIKE wildcards so a user typing "%" searches for a literal percent
 * sign. Pairs with `escape '!'` in the SQL function (C-18).
 */
export function likePattern(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[!%_]/g, (char) => `!${char}`)
    .slice(0, 120)
}

/** C-40: switching currency always drops min, max and page. */
export function buildCurrencyHref(
  current: CatalogQueryInput,
  nextCurrency: CatalogCurrency,
): string {
  const params = new URLSearchParams()
  if (current.q) params.set('q', current.q)
  if (current.game) params.set('game', current.game)
  if (current.status) params.set('status', current.status)
  params.set('currency', nextCurrency)
  params.set('sort', current.sort)
  const query = params.toString()
  return query.length > 0 ? `/products?${query}` : '/products'
}

export function buildCatalogHref(
  current: CatalogQueryInput,
  patch: Partial<CatalogQueryInput>,
): string {
  const params = new URLSearchParams()
  const next = { ...current, ...patch }

  if (next.q) params.set('q', next.q)
  if (next.game) params.set('game', next.game)
  if (next.status) params.set('status', next.status)
  if (next.currency !== 'THB') params.set('currency', next.currency)
  if (next.sort !== 'newest') params.set('sort', next.sort)
  if (next.min !== undefined) params.set('min', String(next.min))
  if (next.max !== undefined) params.set('max', String(next.max))
  if (next.page > 1) params.set('page', String(next.page))

  const query = params.toString()
  return query.length > 0 ? `/products?${query}` : '/products'
}

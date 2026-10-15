import { describe, expect, it } from 'vitest'

import {
  buildCatalogHref,
  buildCurrencyHref,
  CatalogQuery,
  likePattern,
  parseCatalogSearchParams,
} from '@/lib/catalog/search-params'

describe('currency facet', () => {
  it('defaults to THB and has no "all" option', () => {
    const { data } = parseCatalogSearchParams({})
    expect(data.currency).toBe('THB')
  })

  it('drops min, max and page when the currency changes (C-40)', () => {
    // A price of 1250 baht and 1250 kip are different products; carrying the
    // bounds across would show an empty grid that looks like "no results".
    const current = CatalogQuery.parse({
      currency: 'THB',
      min: 100,
      max: 5000,
      page: 4,
      sort: 'price_asc',
      game: 'mobile-legends',
    })

    const href = buildCurrencyHref(current, 'LAK')
    const params = new URL(href, 'http://x').searchParams

    expect(params.get('currency')).toBe('LAK')
    expect(params.get('min')).toBeNull()
    expect(params.get('max')).toBeNull()
    expect(params.get('page')).toBeNull()
    // Unrelated facets survive.
    expect(params.get('sort')).toBe('price_asc')
    expect(params.get('game')).toBe('mobile-legends')
  })
})

describe('per-key validation (C-39)', () => {
  it('drops only the malformed key and keeps the valid ones', () => {
    // The old behaviour discarded the whole set, producing a URL identical to
    // the unfiltered page — a duplicate indexable URL.
    const { data, hasInvalid, invalidKeys } = parseCatalogSearchParams({
      currency: 'LAK',
      min: 'not-a-number',
      game: 'mobile-legends',
    })

    expect(data.currency).toBe('LAK')
    expect(data.game).toBe('mobile-legends')
    expect(data.min).toBeUndefined()
    expect(hasInvalid).toBe(true)
    expect(invalidKeys).toContain('min')
  })

  it('reports no invalidity for a clean query', () => {
    const { hasInvalid } = parseCatalogSearchParams({ currency: 'THB', page: '2' })
    expect(hasInvalid).toBe(false)
  })

  it('rejects an out-of-range page', () => {
    const { hasInvalid, invalidKeys } = parseCatalogSearchParams({ page: '99999' })
    expect(hasInvalid).toBe(true)
    expect(invalidKeys).toContain('page')
  })

  it('ignores unknown keys without flagging them', () => {
    const { data, hasInvalid } = parseCatalogSearchParams({ utm_source: 'facebook' })
    expect(hasInvalid).toBe(false)
    expect(data.currency).toBe('THB')
  })

  it('rejects an over-long query string', () => {
    const { hasInvalid } = parseCatalogSearchParams({ q: 'a'.repeat(200) })
    expect(hasInvalid).toBe(true)
  })

  it('rejects a slug with disallowed characters', () => {
    const { hasInvalid } = parseCatalogSearchParams({ game: '../etc/passwd' })
    expect(hasInvalid).toBe(true)
  })
})

describe('min/max coherence', () => {
  it('drops the bounds when min exceeds max', () => {
    const { data } = parseCatalogSearchParams({ min: '900', max: '100' })
    expect(data.min).toBeUndefined()
    expect(data.max).toBeUndefined()
  })
})

describe('likePattern', () => {
  it('escapes the LIKE wildcards with the escape character the SQL declares', () => {
    // Pairs with ESCAPE '!' in search_products (C-18).
    expect(likePattern('%')).toBe('!%')
    expect(likePattern('_')).toBe('!_')
    expect(likePattern('!')).toBe('!!')
  })

  it('lowercases and trims', () => {
    expect(likePattern('  ML-20481  ')).toBe('ml-20481')
  })

  it('leaves an ordinary query untouched', () => {
    expect(likePattern('mobile legends')).toBe('mobile legends')
  })
})

describe('buildCatalogHref', () => {
  it('omits defaults so the canonical URL stays clean', () => {
    const query = CatalogQuery.parse({})
    expect(buildCatalogHref(query, {})).toBe('/products')
  })

  it('includes non-default values', () => {
    const query = CatalogQuery.parse({})
    const href = buildCatalogHref(query, { currency: 'LAK', page: 2 })
    expect(href).toContain('currency=LAK')
    expect(href).toContain('page=2')
  })
})

import { describe, expect, it } from 'vitest'

import { formatCount, formatDateTime } from '@/lib/format/number'
import { formatPrice, formatCodePrice, getProductPrices, priceValue } from '@/lib/format/money'

/**
 * These assertions pin the exact output string, not just "it contains a
 * digit". A locale regression here silently changes every price and every
 * date on the storefront, and a snapshot-style test would just record the
 * broken output as correct.
 */
describe('formatPrice', () => {
  it('renders THB with the baht sign and a thousands separator', () => {
    expect(formatPrice(1250, 'THB')).toBe('฿1,250')
  })

  it('renders LAK with the spelled-out unit, no currency symbol', () => {
    expect(formatPrice(1_250_000, 'LAK')).toBe('1,250,000 ลาว (LAK)')
  })

  it('does not use Intl currency style, which would add two decimals', () => {
    expect(formatPrice(1250, 'THB')).not.toContain('.00')
    expect(formatPrice(1_250_000, 'LAK')).not.toContain('.00')
  })

  it('accepts a bigint without losing precision above 2^53', () => {
    const large = 9_007_199_254_740_993n // 2^53 + 1
    expect(formatPrice(large, 'THB')).toBe('฿9,007,199,254,740,993')
  })

  it('renders zero rather than an empty string', () => {
    expect(formatPrice(0, 'THB')).toBe('฿0')
  })
})

describe('formatCodePrice & getProductPrices (dual-currency)', () => {
  it('renders THB and LAK with clear currency codes and thousands separators', () => {
    expect(formatCodePrice(350, 'THB')).toBe('350 THB')
    expect(formatCodePrice(220_000, 'LAK')).toBe('220,000 LAK')
  })

  it('extracts both THB and LAK prices independently without conversion', () => {
    const dual = getProductPrices({
      price_amount: 350,
      currency: 'THB',
      price_thb: 350,
      price_lak: 220_000,
    })
    expect(dual).toEqual({ thb: 350, lak: 220_000 })
  })

  it('falls back to legacy price_amount and currency when price_thb/price_lak are null', () => {
    expect(
      getProductPrices({
        price_amount: 1200,
        currency: 'THB',
        price_thb: null,
        price_lak: null,
      }),
    ).toEqual({ thb: 1200, lak: null })

    expect(
      getProductPrices({
        price_amount: 450_000,
        currency: 'LAK',
      }),
    ).toEqual({ thb: null, lak: 450_000 })
  })
})

describe('priceValue', () => {
  it('has no separator, for JSON-LD offers and meta tags', () => {
    // The plan separates these on purpose: a formatted price with a comma is
    // invalid in schema.org offers.
    expect(priceValue(1250n)).toBe('1250')
    expect(priceValue(1_250_000)).toBe('1250000')
  })
})

describe('formatCount', () => {
  it('uses Latin digits even though the locale is Thai', () => {
    // Without the -u-nu-latn extension a Thai default locale renders
    // Arabic-Indic digits, which is the single most visible regression here.
    expect(formatCount(1250)).toBe('1,250')
    expect(formatCount(0)).toBe('0')
  })
})

describe('formatDateTime', () => {
  it('renders the Gregorian year, not the Buddhist year', () => {
    const formatted = formatDateTime('2026-03-15T09:30:00.000Z')
    expect(formatted).toContain('2026')
    expect(formatted).not.toContain('2569')
  })

  it('formats in Asia/Bangkok regardless of the host time zone', () => {
    // 2026-03-15T18:00:00Z is already the 16th in Bangkok (+07:00).
    const formatted = formatDateTime('2026-03-15T18:00:00.000Z')
    expect(formatted).toMatch(/16/)
  })
})

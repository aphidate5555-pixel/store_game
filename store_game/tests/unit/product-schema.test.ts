import { describe, expect, it } from 'vitest'

import { productUpsertSchema, categorySchema } from '@/lib/validation/product'

/**
 * The price rules are the interesting ones. priceAmount is coerced from a
 * form field, so '' becomes 0 rather than NaN — which is why the integer
 * rule below is what actually rejects an empty price, and why that case needs
 * its own assertion rather than being assumed.
 */
describe('productUpsertSchema — price', () => {
  const base = {
    productCode: 'ML-20481',
    name: 'ไอดีเกมทดสอบ',
    gameId: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
    currency: 'THB',
  }

  it('accepts zero — a free account is a real product', () => {
    const result = productUpsertSchema.safeParse({ ...base, priceAmount: 0 })
    expect(result.success).toBe(true)
  })

  it('rejects an empty price', () => {
    const result = productUpsertSchema.safeParse({ ...base, priceAmount: '' })
    expect(result.success).toBe(false)
  })

  it('rejects a negative price', () => {
    expect(productUpsertSchema.safeParse({ ...base, priceAmount: -1 }).success).toBe(false)
  })

  it('rejects a fractional price', () => {
    expect(productUpsertSchema.safeParse({ ...base, priceAmount: 1250.5 }).success).toBe(false)
  })

  it('rejects a price that is not a number at all', () => {
    expect(productUpsertSchema.safeParse({ ...base, priceAmount: 'เยอะมาก' }).success).toBe(false)
  })

  it('rejects a price beyond the sane ceiling', () => {
    expect(productUpsertSchema.safeParse({ ...base, priceAmount: 1e12 }).success).toBe(false)
  })

  it('accepts a numeric string, because forms submit strings', () => {
    expect(productUpsertSchema.safeParse({ ...base, priceAmount: '1250' }).success).toBe(true)
  })
})

describe('productUpsertSchema — code', () => {
  const base = {
    name: 'ไอดีเกม',
    gameId: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
    priceAmount: 100,
    currency: 'THB',
  }

  it('accepts the documented shape', () => {
    expect(productUpsertSchema.safeParse({ ...base, productCode: 'ML-20481' }).success).toBe(true)
  })

  it('rejects a single character', () => {
    // The regex is {1,31} after the first character, so the minimum is 2.
    expect(productUpsertSchema.safeParse({ ...base, productCode: 'M' }).success).toBe(false)
  })

  it('rejects spaces, slashes and Thai characters', () => {
    for (const code of ['ML 20481', 'ML/20481', 'ไอดีเกม', 'ML_20481', '../etc']) {
      expect(productUpsertSchema.safeParse({ ...base, productCode: code }).success, code).toBe(false)
    }
  })

  it('rejects a code longer than 32 characters', () => {
    expect(productUpsertSchema.safeParse({ ...base, productCode: 'A'.repeat(33) }).success).toBe(
      false,
    )
  })

  it('rejects an empty code', () => {
    expect(productUpsertSchema.safeParse({ ...base, productCode: '' }).success).toBe(false)
  })
})

describe('productUpsertSchema — required fields', () => {
  const base = {
    productCode: 'ML-1',
    name: 'ไอดีเกม',
    gameId: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
    priceAmount: 100,
    currency: 'THB',
  }

  it('rejects a missing name', () => {
    const { name: _name, ...withoutName } = base
    expect(productUpsertSchema.safeParse(withoutName).success).toBe(false)
  })

  it('rejects a gameId that is not a uuid', () => {
    expect(productUpsertSchema.safeParse({ ...base, gameId: 'not-a-uuid' }).success).toBe(false)
  })

  it('rejects an unknown currency', () => {
    expect(productUpsertSchema.safeParse({ ...base, currency: 'USD' }).success).toBe(false)
  })

  it('applies the status default', () => {
    const result = productUpsertSchema.safeParse(base)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('available')
      expect(result.data.isVisible).toBe(true)
      expect(result.data.heroCount).toBe(0)
    }
  })

  it('rejects negative hero and skin counts', () => {
    expect(productUpsertSchema.safeParse({ ...base, heroCount: -1 }).success).toBe(false)
    expect(productUpsertSchema.safeParse({ ...base, skinCount: -5 }).success).toBe(false)
  })

  it('rejects an over-long name', () => {
    expect(productUpsertSchema.safeParse({ ...base, name: 'ก'.repeat(121) }).success).toBe(false)
  })
})

describe('categorySchema', () => {
  it('accepts a lowercase hyphenated slug', () => {
    expect(
      categorySchema.safeParse({ name: 'MOBILE LEGENDS', slug: 'mobile-legends' }).success,
    ).toBe(true)
  })

  it('rejects an uppercase or underscored slug', () => {
    for (const slug of ['Mobile-Legends', 'mobile_legends', 'mobile legends', '/games']) {
      expect(categorySchema.safeParse({ name: 'X', slug }).success, slug).toBe(false)
    }
  })

  it('rejects a slug with a leading or trailing hyphen', () => {
    expect(categorySchema.safeParse({ name: 'X', slug: '-mobile' }).success).toBe(false)
    expect(categorySchema.safeParse({ name: 'X', slug: 'mobile-' }).success).toBe(false)
  })

  it('rejects a double hyphen, which would produce a URL that reads oddly', () => {
    expect(categorySchema.safeParse({ name: 'X', slug: 'mobile--legends' }).success).toBe(false)
  })

  it('requires a name', () => {
    expect(categorySchema.safeParse({ name: '', slug: 'mobile' }).success).toBe(false)
  })

  it('defaults is_enabled to true and position to 0', () => {
    const result = categorySchema.safeParse({ name: 'X', slug: 'mobile' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.is_enabled).toBe(true)
      expect(result.data.position).toBe(0)
    }
  })
})

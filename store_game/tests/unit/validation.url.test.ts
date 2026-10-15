import { describe, expect, it } from 'vitest'

import { safeAdminNext, safeExternal, safeHref, safeInternal, EXTERNAL_HOSTS } from '@/lib/validation/url'

/**
 * The allowlist is the security boundary for every administrator-authored
 * link, including the ones rendered in the site header of every page. Each
 * case below is an attack that a prefix check would have accepted.
 */
describe('safeInternal', () => {
  it('accepts ordinary paths', () => {
    expect(safeInternal('/games')).toBe('/games')
    expect(safeInternal('/products/ML-1?a=b#c')).toBe('/products/ML-1?a=b#c')
  })

  it('rejects protocol-relative URLs', () => {
    // '//evil.com' is parsed as a scheme-relative absolute URL by browsers.
    expect(safeInternal('//evil.com')).toBeNull()
  })

  it('rejects backslashes', () => {
    // '/\evil.com' is normalised to '//evil.com' by several browsers.
    expect(safeInternal('/\\evil.com')).toBeNull()
    expect(safeInternal('/a\\b')).toBeNull()
  })

  it('rejects control characters, spaces and angle brackets', () => {
    // These are the C-6 bypasses: a naive check for a leading slash passes.
    expect(safeInternal('/a\tb')).toBeNull()
    expect(safeInternal('/a\rb')).toBeNull()
    expect(safeInternal('/a\nb')).toBeNull()
    expect(safeInternal('/a b')).toBeNull()
    expect(safeInternal('/a<b')).toBeNull()
    expect(safeInternal('/a>b')).toBeNull()
  })

  it('rejects a missing leading slash', () => {
    expect(safeInternal('games')).toBeNull()
    expect(safeInternal('https://evil.com')).toBeNull()
  })

  it('caps the length', () => {
    expect(safeInternal(`/${'a'.repeat(300)}`)).toBeNull()
  })
})

describe('safeExternal', () => {
  it('accepts the WhatsApp deep links the CTA actually produces', () => {
    expect(safeExternal('https://wa.me/66812345678')).not.toBeNull()
    expect(safeExternal('https://wa.me/66812345678?text=hello')).not.toBeNull()
  })

  it('rejects a wa.me path that is not a phone number', () => {
    expect(safeExternal('https://wa.me/')).toBeNull()
    expect(safeExternal('https://wa.me/123')).toBeNull()
  })

  it('rejects social look-alike domains', () => {
    // Both start with an allowed prefix but resolve to the attacker's host.
    expect(safeExternal('https://www.facebook.com.evil.com/')).toBeNull()
    expect(safeExternal('https://www.facebook.com@evil.com/')).toBeNull()
  })

  it('rejects http, credentials and unknown hosts', () => {
    expect(safeExternal('http://facebook.com')).toBeNull()
    expect(safeExternal('https://user:pass@facebook.com')).toBeNull()
    expect(safeExternal('https://evil.com')).toBeNull()
    expect(safeExternal('not a url')).toBeNull()
  })

  it('exports a host set the SQL CHECK constraints must mirror', () => {
    // tests/unit/sql-allowlist-parity.test.ts reads the SQL and compares.
    expect(EXTERNAL_HOSTS).toContain('wa.me')
    expect(EXTERNAL_HOSTS).not.toContain('wa.link')
  })
})

describe('safeAdminNext', () => {
  it('accepts paths inside the admin area', () => {
    expect(safeAdminNext('/admin')).toBe('/admin')
    expect(safeAdminNext('/admin/products')).toBe('/admin/products')
  })

  it('rejects the prefix-collision form', () => {
    // '/administrator' starts with '/admin' as a string but is not the admin
    // area, which is why the pattern requires / or end-of-string.
    expect(safeAdminNext('/administrator')).toBeNull()
  })

  it('rejects anything outside /admin', () => {
    expect(safeAdminNext('/')).toBeNull()
    expect(safeAdminNext('/products')).toBeNull()
    expect(safeAdminNext('https://evil.com')).toBeNull()
  })
})

describe('safeHref', () => {
  it('dispatches to the right validator', () => {
    expect(safeHref('/games', 'internal')).toBe('/games')
    expect(safeHref('/games', 'external')).toBeNull()
  })
})

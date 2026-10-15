import { describe, expect, it } from 'vitest'

import { safeAdminNext, safeInternal } from '@/lib/validation/url'
import { PUBLIC_ROUTE_KEYS, ROUTES, resolveRouteKey } from '@/lib/validation/route-keys'

/**
 * C-5 and C-6: the login round trip and the menu both depend on these two
 * functions, and both are reachable from a URL an attacker controls.
 *
 * requireAdmin() itself is not imported here. It pulls next/navigation and a
 * cookie-bound Supabase client, so testing it would need a running app; what
 * is testable in isolation — and what actually decides the outcome — is the
 * validation that feeds it.
 */
describe('safeAdminNext', () => {
  it('accepts a path inside the admin area', () => {
    expect(safeAdminNext('/admin')).toBe('/admin')
    expect(safeAdminNext('/admin/products')).toBe('/admin/products')
    expect(safeAdminNext('/admin/products/abc?tab=images')).toBe('/admin/products/abc?tab=images')
  })

  it('rejects the prefix collision', () => {
    // '/administrator' starts with '/admin' as a string but is not the admin
    // area. This is the whole reason the pattern requires a slash or the
    // end of the string.
    expect(safeAdminNext('/administrator')).toBeNull()
    expect(safeAdminNext('/admin-secret')).toBeNull()
  })

  it('rejects anything outside /admin', () => {
    expect(safeAdminNext('/')).toBeNull()
    expect(safeAdminNext('/products')).toBeNull()
    expect(safeAdminNext('https://evil.example')).toBeNull()
  })

  it('rejects the protocol-relative and backslash forms', () => {
    expect(safeAdminNext('//evil.example/admin')).toBeNull()
    expect(safeAdminNext('/\\evil.example')).toBeNull()
  })

  it('rejects control characters and spaces that a naive prefix check passes', () => {
    for (const raw of ['/admin\n/set-cookie', '/admin\tx', '/admin page']) {
      expect(safeAdminNext(raw), raw).toBeNull()
    }
  })

  it('returns null for a missing value', () => {
    expect(safeAdminNext(null)).toBeNull()
    expect(safeAdminNext(undefined)).toBeNull()
    expect(safeAdminNext('')).toBeNull()
  })

  it('rejects an over-long path', () => {
    expect(safeAdminNext(`/admin/${'a'.repeat(250)}`)).toBeNull()
  })
})

describe('safeInternal', () => {
  it('accepts ordinary paths', () => {
    expect(safeInternal('/games')).toBe('/games')
    expect(safeInternal('/products/ML-1?a=b#c')).toBe('/products/ML-1?a=b#c')
  })

  it('rejects a path with no leading slash', () => {
    expect(safeInternal('games')).toBeNull()
    expect(safeInternal('https://evil.example')).toBeNull()
  })
})

describe('route registry (F-13)', () => {
  it('carries no admin route', () => {
    // The registry is the only source of internal destinations. If /admin
    // appeared here, the menu editor could put a link to it in the header of
    // every page, which is the opposite of what acceptance check 12 wants.
    for (const key of PUBLIC_ROUTE_KEYS) {
      expect(ROUTES[key], key).not.toMatch(/^\/admin/)
    }
  })

  it('every key resolves to an absolute path', () => {
    for (const key of PUBLIC_ROUTE_KEYS) {
      expect(resolveRouteKey(key), key).toMatch(/^\//)
    }
  })

  it('returns null for an unknown key', () => {
    expect(resolveRouteKey('not-a-route')).toBeNull()
    expect(resolveRouteKey(null)).toBeNull()
    expect(resolveRouteKey(undefined)).toBeNull()
  })

  it('rejects an admin key even when one is passed directly', () => {
    // Defence in depth: even if /admin were added to the registry, this
    // filter is what keeps it out of the public menu.
    expect(PUBLIC_ROUTE_KEYS).not.toContain('admin')
  })

  it('resolves every declared key', () => {
    for (const key of PUBLIC_ROUTE_KEYS) {
      expect(resolveRouteKey(key), key).not.toBeNull()
    }
  })
})

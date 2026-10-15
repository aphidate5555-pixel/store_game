import { describe, expect, it, vi } from 'vitest'

import { readSection } from '@/lib/validation/site-sections'
import { isSectionEnabled, resolveStrings, sectionPayload } from '@/lib/catalog/site-content'
import { SITE_DEFAULTS } from '@/lib/i18n/th/defaults'
import { getMessages } from '@/lib/i18n'
import type { Database } from '@/lib/database.types'

type SectionRow = Database['public']['Tables']['site_sections']['Row']

const row = (section_key: string, payload: unknown): SectionRow => ({
  section_key,
  payload: payload as SectionRow['payload'],
  updated_at: '2026-01-01T00:00:00.000Z',
})

describe('readSection', () => {
  it('returns the default for an empty payload', () => {
    // An empty payload means "the administrator has not edited this yet", not
    // "the section is empty".
    const hero = readSection('hero', {})
    expect(hero.title).toBe(SITE_DEFAULTS.hero.title)
    expect(hero.enabled).toBe(SITE_DEFAULTS.hero.enabled)
  })

  it('returns the default for a malformed payload, without throwing', () => {
    // Data that drifted is not a reason to take the storefront down.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    for (const bad of [null, undefined, 'a string', 42, [1, 2, 3], true]) {
      expect(() => readSection('hero', bad)).not.toThrow()
      expect(readSection('hero', bad).title).toBe(SITE_DEFAULTS.hero.title)
    }

    warn.mockRestore()
  })

  it('merges a valid partial over the default', () => {
    const hero = readSection('hero', { title: 'หัวเรื่องใหม่' })
    expect(hero.title).toBe('หัวเรื่องใหม่')
    // Everything the patch did not mention keeps its default.
    expect(hero.subtitle).toBe(SITE_DEFAULTS.hero.subtitle)
    expect(hero.cta_text).toBe(SITE_DEFAULTS.hero.cta_text)
  })

  it('rejects a hero CTA destination that is not a route key (F-13)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const hero = readSection('hero', { cta_route: 'https://evil.example' })
    expect(hero.cta_route).toBe(SITE_DEFAULTS.hero.cta_route)
    warn.mockRestore()
  })

  it('accepts a route key from the registry', () => {
    const hero = readSection('hero', { cta_route: 'products' })
    expect(hero.cta_route).toBe('products')
  })

  it('drops values beyond the declared maximum', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(readSection('all_products', { per_page: 5000 }).per_page).toBe(
      SITE_DEFAULTS.all_products.per_page,
    )
    warn.mockRestore()
  })

  it('falls back for a navigation item whose route is unknown', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const navigation = readSection('navigation', {
      items: [{ label: 'หน้าแปลก', route: 'not-a-route' }],
    })
    expect(navigation.items).toEqual(SITE_DEFAULTS.navigation.items)
    warn.mockRestore()
  })
})

describe('sectionPayload', () => {
  it('returns an empty object when the section is absent', () => {
    expect(sectionPayload([], 'hero')).toEqual({})
  })

  it('returns the stored payload when present', () => {
    expect(sectionPayload([row('hero', { title: 'X' })], 'hero')).toEqual({ title: 'X' })
  })

  it('returns an empty object for a non-object payload', () => {
    // A payload of 'true' is not something the components can read; returning
    // {} keeps every call site's destructuring safe.
    expect(sectionPayload([row('hero', 'nonsense')], 'hero')).toEqual({})
  })
})

describe('isSectionEnabled', () => {
  it('treats a missing payload as enabled', () => {
    // Enabled is the default so a partially migrated database still renders
    // the storefront rather than an empty page.
    expect(isSectionEnabled([], 'hero')).toBe(true)
  })

  it('honours enabled: false', () => {
    expect(isSectionEnabled([row('hero', { enabled: false })], 'hero')).toBe(false)
  })

  it('is enabled for any other value', () => {
    expect(isSectionEnabled([row('hero', { enabled: true })], 'hero')).toBe(true)
  })
})

describe('resolveStrings', () => {
  it('lets the database win over the dictionary', () => {
    const messages = getMessages()
    const merged = resolveStrings(messages, [row('hero', { title: 'จากฐานข้อมูล' })])
    expect(merged.hero.title).toBe('จากฐานข้อมูล')
  })

  it('drops keys the dictionary does not declare', () => {
    const messages = getMessages()
    const merged = resolveStrings(messages, [
      row('hero', { title: 'ok', injected_key: 'ต้องไม่โผล่' }),
    ])
    expect('injected_key' in merged.hero).toBe(false)
  })

  it('keeps nested structures rather than flattening them', () => {
    // resolveStrings walks the STOREFRONT message groups. navigation is not
    // one of them — the menu is built from SITE_DEFAULTS via buildNavItems,
    // not from the dictionary — so the nested case is exercised on a group
    // that does exist.
    const messages = getMessages()
    const merged = resolveStrings(messages, [
      row('whatsapp', { missingTitle: 'ยังติดต่อร้านไม่ได้ (แก้แล้ว)' }),
    ])
    expect(typeof merged.whatsapp.missingTitle).toBe('string')
    expect(merged.whatsapp.missingTitle).toBe('ยังติดต่อร้านไม่ได้ (แก้แล้ว)')
    // The sibling keys of the same group survive the merge.
    expect(merged.whatsapp.copied).toBe(messages.whatsapp.copied)
  })

  it('leaves the dictionary untouched when nothing matches', () => {
    const messages = getMessages()
    const merged = resolveStrings(messages, [])
    expect(merged.hero.title).toBe(messages.hero.title)
  })
})

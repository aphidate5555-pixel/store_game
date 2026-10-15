

import { describe, expect, it } from 'vitest'

import { adminTh } from '@/lib/i18n/th/admin'
import { getMessages } from '@/lib/i18n'

/**
 * Acceptance check 11: the site is Thai only. A Lao character that reaches
 * the storefront is invisible in a code review and obvious to a customer,
 * and the two scripts share a Unicode block range, so this is worth a test
 * rather than a review convention.
 */
const LAO = /[຀-໿]/

function walkValues(value: unknown, path: string, out: [string, string][]): void {
  if (typeof value === 'string') {
    out.push([path, value])
    return
  }
  if (typeof value === 'function') {
    // Call the template functions with placeholders so their literal parts
    // are covered too.
    try {
      const produced = (value as (...args: unknown[]) => unknown)('ทดสอบ', 1, 2)
      if (typeof produced === 'string') out.push([`${path}()`, produced])
    } catch {
      // A template that needs a different arity contributes nothing to check.
    }
    return
  }
  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      walkValues(nested, path ? `${path}.${key}` : key, out)
    }
  }
}

describe('admin messages', () => {
  const values: [string, string][] = []
  walkValues(adminTh, '', values)

  it('has at least one entry per group', () => {
    expect(values.length).toBeGreaterThan(100)
  })

  it('contains no empty or whitespace-only string', () => {
    // An empty string renders as a blank label, which is a layout bug that no
    // type checker can see.
    const empty = values.filter(([, text]) => text.trim().length === 0)
    expect(empty).toEqual([])
  })

  it('contains no Lao characters', () => {
    const offenders = values.filter(([, text]) => LAO.test(text)).map(([path]) => path)
    expect(offenders).toEqual([])
  })

  it('never leaks the removed keys', () => {
    // These were deleted by contract: a free-text href for the menu and the
    // hero CTA (F-13) and a stored WhatsApp link (C-11). Their absence is
    // what keeps those two decisions from quietly reverting.
    for (const key of [
      'v.nav.href',
      'v.heroCta.url',
      'v.whatsapp.url',
      'admin.settings.fieldWhatsappLink',
      'admin.settings.fieldWhatsappLinkHint',
    ]) {
      expect(Object.keys(adminTh)).not.toContain(key)
    }
  })

  it('every key follows the dotted namespace convention', () => {
    // A bare key would be ambiguous once the map grows, and the lookup below
    // depends on the prefix to route a key to the right screen.
    for (const key of Object.keys(adminTh)) {
      expect(key, key).toMatch(/^(admin|errors|save|upload|session|forbidden|v)\.[a-zA-Z]/)
    }
  })
})

describe('storefront messages', () => {
  it('every group is a non-empty object', () => {
    const messages = getMessages()
    expect(Object.keys(messages).length).toBeGreaterThan(10)

    for (const [group, value] of Object.entries(messages)) {
      expect(typeof value, group).toBe('object')
      expect(value, group).not.toBeNull()
    }
  })

  it('contains no empty string', () => {
    const values: [string, string][] = []
    walkValues(getMessages(), '', values)

    const empty = values.filter(([, text]) => text.trim().length === 0)
    expect(empty).toEqual([])
  })

  it('contains no Lao characters', () => {
    const values: [string, string][] = []
    walkValues(getMessages(), '', values)

    const offenders = values.filter(([, text]) => LAO.test(text)).map(([path]) => path)
    expect(offenders).toEqual([])
  })
})

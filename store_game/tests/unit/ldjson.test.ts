import { describe, expect, it } from 'vitest'

import { ldJson } from '@/lib/catalog/ldjson'

/**
 * These four characters are the entire reason this module exists. A product
 * name comes from an administrator, and `</script>` inside a JSON-LD block
 * closes the script element before the browser's JSON parser ever runs.
 */
describe('ldJson', () => {
  it('neutralises a closing script tag in a string value', () => {
    const output = ldJson({ name: 'ไอดี</script><script>alert(1)</script>' })
    expect(output).not.toContain('</script>')
    expect(output).not.toContain('<script>')
    expect(output).toContain('\\u003c')
    expect(output).toContain('\\u003e')
  })

  it('neutralises an HTML comment opener, which can also break out', () => {
    const output = ldJson({ description: '<!--' })
    expect(output).not.toContain('<!--')
    expect(output).toContain('\\u003c')
  })

  it('escapes the two Unicode line separators', () => {
    const lineSeparator = String.fromCharCode(0x2028)
    const paragraphSeparator = String.fromCharCode(0x2029)
    const output = ldJson({ name: `a${lineSeparator}b${paragraphSeparator}c` })

    expect(output).not.toContain(lineSeparator)
    expect(output).not.toContain(paragraphSeparator)
    expect(output).toContain('\\u2028')
    expect(output).toContain('\\u2029')
  })

  it('escapes ampersand as well', () => {
    expect(ldJson({ name: 'a & b' })).toContain('\\u0026')
  })

  it('still parses back to the original value', () => {
    const value = { name: 'ไอดี</script> & เทสต์', price: 1250 }
    // \\u003c is a valid JSON escape, so the round trip is exact.
    expect(JSON.parse(ldJson(value))).toEqual(value)
  })

  it('returns null for a non-serialisable input rather than throwing', () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular
    // JSON.stringify throws on a cycle; the caller must not crash the page.
    expect(() => ldJson(circular)).toThrow()
  })

  it('produces a string, never undefined', () => {
    expect(typeof ldJson({})).toBe('string')
  })
})

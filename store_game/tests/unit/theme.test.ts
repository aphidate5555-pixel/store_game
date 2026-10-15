import { describe, expect, it } from 'vitest'

import {
  contrastRatio,
  deriveInk,
  derivePalette,
  ensureContrast,
  isHexColor,
  MIN_TEXT_CONTRAST,
  normalizeHex,
  relativeLuminance,
  SURFACE_TOKENS,
} from '@/lib/settings/theme'
import { brandCssBlock, isSafeCssBlock } from '@/lib/settings/brand-css'
import { failingPairs, REQUIRED_PAIRS } from '@/lib/theme/brand-tokens'

describe('isHexColor', () => {
  it('accepts six-digit hex only', () => {
    expect(isHexColor('#E11D2E')).toBe(true)
    expect(isHexColor('#e11d2e')).toBe(true)
  })

  it('rejects three-digit hex', () => {
    // Three-digit form is ambiguous when expanded and was a source of
    // inconsistent rendering between the form preview and the live page.
    expect(isHexColor('#F00')).toBe(false)
  })

  it('rejects named colours and CSS functions', () => {
    // A named colour reaching the style attribute is a CSS injection vector,
    // and 'red' also has a different P3 rendering from #FF0000 on some
    // displays.
    expect(isHexColor('red')).toBe(false)
    expect(isHexColor('rgb(255,0,0)')).toBe(false)
    expect(isHexColor('var(--x)')).toBe(false)
    expect(isHexColor('expression(alert(1))')).toBe(false)
  })

  it('rejects non-strings', () => {
    expect(isHexColor(null)).toBe(false)
    expect(isHexColor(0xff0000)).toBe(false)
    expect(isHexColor({})).toBe(false)
  })
})

describe('normalizeHex', () => {
  it('upper-cases so a saved value compares equal to a token', () => {
    expect(normalizeHex('  #e11d2e ')).toBe('#E11D2E')
  })
})

describe('relativeLuminance', () => {
  it('matches the WCAG reference values', () => {
    // White and black are the two fixed points; anything else is compared
    // against them.
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5)
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5)
  })

  it('is monotonic: lighter colours score higher', () => {
    const dark = relativeLuminance('#101014')
    const mid = relativeLuminance('#808080')
    const light = relativeLuminance('#F5F5F7')
    expect(dark).toBeLessThan(mid)
    expect(mid).toBeLessThan(light)
  })
})

describe('contrastRatio', () => {
  it('is symmetric', () => {
    expect(contrastRatio('#FFFFFF', '#08080A')).toBeCloseTo(contrastRatio('#08080A', '#FFFFFF'), 6)
  })

  it('returns 1 for identical colours', () => {
    expect(contrastRatio('#101014', '#101014')).toBeCloseTo(1, 6)
  })

  it('reproduces the white-on-brand figure quoted in the design section', () => {
    // 4.75:1 — the reason the white focus ring is legible on the red button.
    expect(contrastRatio('#FFFFFF', '#E11D2E')).toBeCloseTo(4.75, 1)
  })
})

describe('deriveInk', () => {
  it('picks white on a dark brand and dark ink on a light one', () => {
    expect(deriveInk('#E11D2E')).toBe('#FFFFFF')
    expect(deriveInk('#F5F5F7')).toBe('#111727')
  })
})

describe('derivePalette', () => {
  it('returns normalised values', () => {
    const palette = derivePalette('#e11d2e')
    expect(palette.primary).toBe('#E11D2E')
    expect(isHexColor(palette.primaryHover)).toBe(true)
    expect(isHexColor(palette.primarySoft)).toBe(true)
    expect(palette.onPrimary).toBe('#FFFFFF')
  })

  it('refuses a non-hex input rather than guessing', () => {
    expect(() => derivePalette('red')).toThrow()
  })
})

describe('ensureContrast', () => {
  it('returns an already-passing colour unchanged', () => {
    const input = '#F5F5F7'
    expect(ensureContrast(input, [SURFACE_TOKENS.surface])).toBe('#F5F5F7')
  })

  it('darkens a failing colour until it passes every background', () => {
    // #2A2A33 is the case the plan calls out: too close to surface-3.
    const result = ensureContrast('#2A2A33', [SURFACE_TOKENS.surface, SURFACE_TOKENS.surface3])
    for (const background of [SURFACE_TOKENS.surface, SURFACE_TOKENS.surface3]) {
      expect(contrastRatio(result, background)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
    }
  })

  it('never returns pure black', () => {
    // Clamping to #000000 would pass every contrast test and destroy the
    // brand. The floor is a bounded dark instead.
    const result = ensureContrast('#2A2A33', [SURFACE_TOKENS.surface, SURFACE_TOKENS.surface3])
    expect(result).not.toBe('#000000')
    expect(result).toMatch(/^#[0-9A-F]{6}$/)
  })

  it('is idempotent', () => {
    const once = ensureContrast('#2A2A33', [SURFACE_TOKENS.surface3])
    expect(ensureContrast(once, [SURFACE_TOKENS.surface3])).toBe(once)
  })

  it('passes an invalid value straight through for the caller to reject', () => {
    expect(ensureContrast('red', ['#FFFFFF'])).toBe('red')
  })
})

describe('brandCssBlock', () => {
  it('emits only custom properties', () => {
    const block = brandCssBlock('#E11D2E', '#F59E0B')
    expect(block).not.toBeNull()
    expect(block).toContain('--color-primary:#E11D2E')
    expect(block).toContain('--color-accent:#F59E0B')
    expect(isSafeCssBlock(block)).toBe(true)
  })

  it('rejects a javascript: payload', () => {
    expect(isSafeCssBlock('javascript:alert(1)')).toBe(false)
    expect(brandCssBlock('javascript:alert(1)', null)).toBeNull()
  })

  it('rejects an attempt to close the style attribute', () => {
    expect(isSafeCssBlock('--color-primary:#fff"><script>alert(1)</script>')).toBe(false)
    expect(isSafeCssBlock("--color-primary:#FFF';background:url(x)")).toBe(false)
  })

  it('rejects url() and @import', () => {
    expect(isSafeCssBlock('--color-primary:url(https://evil.example)')).toBe(false)
    expect(isSafeCssBlock('@import "https://evil.example"')).toBe(false)
  })

  it('rejects a three-digit hex, which the palette never produces but a hand-edited value could', () => {
    expect(isSafeCssBlock('--color-primary:#F00')).toBe(false)
  })

  it('returns null when neither colour is usable', () => {
    expect(brandCssBlock(null, null)).toBeNull()
    expect(brandCssBlock('nonsense', 'nonsense')).toBeNull()
  })

  it('accepts an accent on its own', () => {
    const block = brandCssBlock(null, '#F59E0B')
    expect(block).toContain('--color-accent:#F59E0B')
    expect(block).not.toContain('--color-primary:')
  })
})

describe('design token contrast', () => {
  it('every pair the UI renders clears its threshold', () => {
    // If this fails, a colour changed without anyone re-checking a screen.
    expect(failingPairs()).toEqual([])
  })

  it('has a non-trivial pair list, so the test is not vacuous', () => {
    expect(REQUIRED_PAIRS.length).toBeGreaterThan(5)
  })
})

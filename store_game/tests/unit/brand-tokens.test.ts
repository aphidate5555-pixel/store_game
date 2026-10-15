import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { contrastRatio, ensureContrast, normalizeHex, relativeLuminance } from '@/lib/settings/theme'
import { brandCssBlock, cssBlockToStyle, isSafeCssBlock } from '@/lib/settings/brand-css'
import { BRAND_DEFAULTS, FOCUS_RING, REQUIRED_PAIRS, SURFACE, failingPairs } from '@/lib/theme/brand-tokens'

describe('contrast', () => {
  it('every pair the storefront renders clears its threshold', () => {
    // The single most valuable assertion in this file: a colour changed
    // without re-checking a screen fails here rather than in a support
    // ticket from someone who cannot read the price.
    expect(failingPairs()).toEqual([])
  })

  it('the pair list is not vacuous', () => {
    expect(REQUIRED_PAIRS.length).toBeGreaterThan(5)
  })

  it('reproduces the WCAG fixed points', () => {
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5)
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5)
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 1)
  })

  it('contrast is symmetric', () => {
    expect(contrastRatio('#A8A8B3', '#101014')).toBeCloseTo(
      contrastRatio('#101014', '#A8A8B3'),
      6,
    )
  })

  it('the focus ring is legible on every surface', () => {
    // The ring is white and 2px; a theme that ever ships a light surface has
    // to keep it visible there too.
    for (const surface of Object.values(SURFACE)) {
      expect(contrastRatio(FOCUS_RING, surface)).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('ensureContrast', () => {
  it('leaves an already-passing colour alone', () => {
    expect(ensureContrast('#F5F5F7', [SURFACE.surface])).toBe('#F5F5F7')
  })

  it('moves a failing colour until it passes', () => {
    const result = ensureContrast('#2A2A33', [SURFACE.surface, SURFACE.surface3])
    for (const background of [SURFACE.surface, SURFACE.surface3]) {
      expect(contrastRatio(result, background)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('never returns pure black', () => {
    // Clamping to #000000 would pass every threshold and erase the brand.
    expect(ensureContrast('#2A2A33', [SURFACE.surface3])).not.toBe('#000000')
  })

  it('is idempotent', () => {
    const once = ensureContrast('#2A2A33', [SURFACE.surface3])
    expect(ensureContrast(once, [SURFACE.surface3])).toBe(once)
  })

  it('passes an unparseable value through for the caller to reject', () => {
    expect(ensureContrast('red', ['#FFFFFF'])).toBe('red')
  })
})

describe('normalizeHex', () => {
  it('upper-cases and trims', () => {
    expect(normalizeHex('  #e11d2e ')).toBe('#E11D2E')
  })
})

describe('isSafeCssBlock', () => {
  it('accepts a well-formed block', () => {
    expect(isSafeCssBlock('--color-primary:#E11D2E')).toBe(true)
  })

  it('rejects script and CSS injection vectors', () => {
    for (const bad of [
      'javascript:alert(1)',
      '--color-primary:url(https://evil.example)',
      '@import "https://evil.example"',
      '--color-primary:#FFF"><script>alert(1)</script>',
      "--color-primary:#FFF';background:url(x)",
      'expression(alert(1))',
      '',
      null,
      undefined,
    ]) {
      expect(isSafeCssBlock(bad as string | null), String(bad)).toBe(false)
    }
  })

  it('rejects a three-digit hex, which the palette never produces', () => {
    // #F00 expands to #FF0000 but renders differently on P3 displays.
    expect(isSafeCssBlock('--color-primary:#F00')).toBe(false)
  })
})

describe('brandCssBlock', () => {
  it('emits only custom properties', () => {
    const block = brandCssBlock(BRAND_DEFAULTS.primary, BRAND_DEFAULTS.accent)
    expect(block).not.toBeNull()
    expect(block).toContain(`--color-primary:${BRAND_DEFAULTS.primary}`)
    expect(block).toContain(`--color-accent:${BRAND_DEFAULTS.accent}`)
  })

  it('applies an accent even when the primary is missing', () => {
    const block = brandCssBlock(null, BRAND_DEFAULTS.accent)
    expect(block).toContain(`--color-accent:${BRAND_DEFAULTS.accent}`)
    expect(block).not.toContain('--color-primary:')
  })

  it('returns null when neither colour is usable', () => {
    expect(brandCssBlock(null, null)).toBeNull()
    expect(brandCssBlock('red', 'blue')).toBeNull()
  })

  it('refuses a javascript: payload', () => {
    expect(brandCssBlock('javascript:alert(1)', null)).toBeNull()
  })
})

describe('cssBlockToStyle', () => {
  it('produces the object React expects', () => {
    // React's style prop takes a mapping; passing the declaration string
    // threw at render, which is how this helper came to exist.
    expect(cssBlockToStyle('--color-primary:#E11D2E;--color-accent:#F59E0B')).toEqual({
      '--color-primary': '#E11D2E',
      '--color-accent': '#F59E0B',
    })
  })

  it('returns an empty object for a null or unsafe block', () => {
    expect(cssBlockToStyle(null)).toEqual({})
    expect(cssBlockToStyle('javascript:alert(1)')).toEqual({})
  })
})

describe('globals.css carries the tokens', () => {
  const cssPath = join(process.cwd(), 'src', 'app', 'globals.css')
  const css = (() => {
    try {
      return readFileSync(cssPath, 'utf8')
    } catch {
      return null
    }
  })()

  const maybe = css === null ? describe.skip : describe

  maybe('token parity', () => {
    it('declares a CSS variable for every colour token the TS exports', () => {
      for (const token of [
        'ink',
        'surface',
        'surface-2',
        'surface-3',
        'line',
        'line-ctl',
        'text',
        'text-2',
        'text-3',
        'primary',
        'primary-hover',
        'on-primary',
        'accent',
        'success',
        'warning',
        'danger',
      ]) {
        expect(css, `globals.css is missing --color-${token}`).toContain(
          `--color-${token}: var(--color-${token},`,
        )
      }
    })

    it('gives every variable a literal fallback', () => {
      // The fallbacks are what make the maintenance screen readable: it
      // renders from the same stylesheet when the settings fetch failed.
      const declarations = css?.match(/--color-[a-z0-9-]+:\s*var\([^)]*\)/g) ?? []
      expect(declarations.length).toBeGreaterThan(10)
      for (const declaration of declarations) {
        expect(declaration, declaration).toMatch(/#[0-9a-fA-F]{6}\s*\)?\s*$/)
      }
    })

    it('defines focus-ring with outline, not a box-shadow ring', () => {
      // A Tailwind ring is a box-shadow and is clipped by overflow-hidden on
      // every card and sheet, which is exactly where the indicator is needed.
      expect(css).toContain('@utility focus-ring')
      const block = css?.slice(css.indexOf('@utility focus-ring')) ?? ''
      expect(block).toContain('outline:')
      expect(block.slice(0, 200)).not.toContain('box-shadow')
    })

    it('has a prefers-reduced-motion block', () => {
      expect(css).toContain('prefers-reduced-motion')
    })
  })
})

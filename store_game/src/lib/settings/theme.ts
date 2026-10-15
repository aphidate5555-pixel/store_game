/**
 * Colour engine.
 *
 * Contrast is computed with the WCAG 2.x relative luminance formula, not the
 * 0.299/0.587/0.114 sRGB average. The average is not the luminance the
 * definition uses, and the difference is large enough to pass a colour that a
 * human cannot read against a dark background.
 */

const HEX = /^#[0-9a-f]{6}$/i

export const isHexColor = (value: unknown): value is string =>
  typeof value === 'string' && HEX.test(value.trim())

export const normalizeHex = (value: string): string => value.trim().toUpperCase()

function srgbToLinear(channel: number): number {
  const c = channel / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '')
  const value = Number.parseInt(normalized, 16)
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  }
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

const mix = (a: string, b: string, weight: number): string => {
  const ca = hexToRgb(a)
  const cb = hexToRgb(b)
  const channel = (x: number, y: number) =>
    Math.round(x * weight + y * (1 - weight))
      .toString(16)
      .padStart(2, '0')
  return `#${channel(ca.r, cb.r)}${channel(ca.g, cb.g)}${channel(ca.b, cb.b)}`.toUpperCase()
}

const LIGHT_INK = '#FFFFFF'
const DARK_INK = '#111727'

export interface Palette {
  readonly primary: string
  readonly primaryHover: string
  readonly primarySoft: string
  readonly onPrimary: string
}

/** The worst background the primary colour has to survive. */
export const SURFACE_TOKENS = {
  ink: '#08080A',
  surface: '#101014',
  surface2: '#16161C',
  surface3: '#1E1E26',
  line: '#26262F',
  lineCtl: '#343440',
} as const

export const TEXT_TOKENS = {
  text: '#F5F5F7',
  text2: '#A8A8B3',
  text3: '#7C7C8A',
} as const

export const STATUS_TOKENS = {
  success: '#22C55E',
  warning: '#EAB308',
  danger: '#EF4444',
} as const

const MAX_CLAMP_STEPS = 30
const LIGHT_TARGET = '#FFFFFF'
const DARK_TARGET = '#0A0A0C'

/**
 * Moves `color` away from the backgrounds until it clears `minRatio` against
 * all of them.
 *
 * The direction is chosen from the backgrounds, not assumed. On this dark theme
 * every surface is near-black, so a failing colour has to be lightened to gain
 * contrast — darkening it would move it *towards* the background and make the
 * ratio worse. The earlier implementation always mixed toward the ink colour,
 * which could never pass on a dark palette.
 */
export function ensureContrast(
  color: string,
  backgrounds: readonly string[],
  minRatio = 4.5,
): string {
  if (!isHexColor(color)) return color
  if (backgrounds.length === 0) return normalizeHex(color)

  const start = normalizeHex(color)
  const passes = (candidate: string): boolean =>
    backgrounds.every((bg) => contrastRatio(candidate, bg) >= minRatio)

  if (passes(start)) return start

  // Average the backgrounds to decide which way to move.
  const reference = mix(
    backgrounds[0] as string,
    backgrounds[backgrounds.length - 1] as string,
    0.5,
  )
  const target = relativeLuminance(reference) > 0.35 ? DARK_TARGET : LIGHT_TARGET

  let current = start
  for (let step = 0; step < MAX_CLAMP_STEPS; step += 1) {
    current = mix(current, target, 0.12)
    if (passes(current)) return current
  }

  // Bounded fallback rather than a pure extreme, so the brand keeps a
  // recognisable hue. The test asserts the result is never #000000.
  return passes(target) ? target : '#F5F5F7'
}

/** Picks the ink that reads on top of `background`. */
export function deriveInk(background: string): string {
  return contrastRatio(background, LIGHT_INK) >= contrastRatio(background, DARK_INK)
    ? LIGHT_INK
    : DARK_INK
}

export function derivePalette(primary: string): Palette {
  if (!isHexColor(primary)) {
    throw new Error('สีหลักต้องเป็น HEX 6 หลัก')
  }

  const normalized = normalizeHex(primary)
  const onPrimary = deriveInk(normalized)

  // Hover is a visible shift, not a brightness filter, so the contrast is
  // predictable in both directions.
  const primaryHover = onPrimary === LIGHT_INK ? mix(normalized, '#000000', 0.12) : mix(normalized, '#FFFFFF', 0.12)

  // A tint of the brand used behind badges and subtle fills. Mixed toward the
  // page background rather than white, because white would make it unusable on
  // a dark surface.
  const primarySoft = mix(normalized, SURFACE_TOKENS.surface2, 0.82)

  return { primary: normalized, primaryHover, primarySoft, onPrimary }
}

/** Contrast of every token pair the design system actually renders. */
export interface ContrastPair {
  readonly label: string
  readonly foreground: string
  readonly background: string
}

export const CONTRAST_PAIRS: readonly ContrastPair[] = [
  { label: 'text on surface', foreground: TEXT_TOKENS.text, background: SURFACE_TOKENS.surface },
  { label: 'text-2 on surface', foreground: TEXT_TOKENS.text2, background: SURFACE_TOKENS.surface },
  { label: 'text-3 on surface', foreground: TEXT_TOKENS.text3, background: SURFACE_TOKENS.surface },
  { label: 'text on surface-3', foreground: TEXT_TOKENS.text, background: SURFACE_TOKENS.surface3 },
  { label: 'success on surface', foreground: STATUS_TOKENS.success, background: SURFACE_TOKENS.surface },
  { label: 'danger on surface', foreground: STATUS_TOKENS.danger, background: SURFACE_TOKENS.surface },
  { label: 'white on primary', foreground: LIGHT_INK, background: '#E11D2E' },
  { label: 'white focus ring on primary', foreground: LIGHT_INK, background: '#E11D2E' },
  { label: 'white focus ring on ink', foreground: LIGHT_INK, background: SURFACE_TOKENS.ink },
]

export const MIN_TEXT_CONTRAST = 4.5
export const MIN_LARGE_CONTRAST = 3

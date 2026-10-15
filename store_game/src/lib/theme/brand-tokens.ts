import { CONTRAST_PAIRS, MIN_LARGE_CONTRAST, MIN_TEXT_CONTRAST, contrastRatio } from '@/lib/settings/theme'

/**
 * The immutable half of the design system.
 *
 * Brand colours live in the database and are injected as CSS variables; these
 * tokens are the surfaces and text colours that never change. Keeping them
 * here — rather than as literals scattered through components — is what lets
 * brand-tokens.test.ts assert that every pair actually used in the UI clears
 * its threshold.
 */
export const BRAND_DEFAULTS = {
  primary: '#E11D2E',
  accent: '#F59E0B',
} as const

export const SURFACE = {
  ink: '#08080A',
  surface: '#101014',
  surface2: '#16161C',
  surface3: '#1E1E26',
  line: '#26262F',
  lineCtl: '#343440',
} as const

export const TEXT = {
  /** Body copy and prices. Never below 14px. */
  base: '#F5F5F7',
  secondary: '#A8A8B3',
  /**
   * Tertiary text. 5.14:1 on `surface`, and explicitly forbidden on
   * `surface3` — the combination is the one pair that fails.
   */
  tertiary: '#7C7C8A',
} as const

export const STATUS = {
  success: '#22C55E',
  warning: '#EAB308',
  danger: '#EF4444',
} as const

/** Focus ring. White, because it has to read on every surface in the theme. */
export const FOCUS_RING = '#FFFFFF'

/** Minimum touch target, in pixels. */
export const TAP_TARGET = 44

/** Minimum body text size, in pixels. */
export const MIN_TEXT_SIZE = 14
/** Form fields are 16px: anything smaller makes iOS Safari zoom on focus. */
export const MIN_INPUT_SIZE = 16

export interface TokenPair {
  readonly label: string
  readonly foreground: string
  readonly background: string
  readonly minimum: number
}

/** Every pair the storefront actually renders. */
export const REQUIRED_PAIRS: readonly TokenPair[] = [
  ...CONTRAST_PAIRS.map((pair) => ({ ...pair, minimum: MIN_TEXT_CONTRAST })),
  // Large text and icons need only 3:1, but this project holds 4.5:1 for
  // them too rather than tracking which elements qualify as "large".
  { label: 'accent on surface', foreground: STATUS.warning, background: SURFACE.surface, minimum: MIN_LARGE_CONTRAST },
  { label: 'accent on surface-2', foreground: STATUS.warning, background: SURFACE.surface2, minimum: MIN_LARGE_CONTRAST },
]

export function passes(pair: TokenPair): boolean {
  return contrastRatio(pair.foreground, pair.background) >= pair.minimum
}

export const failingPairs = (): TokenPair[] => REQUIRED_PAIRS.filter((pair) => !passes(pair))

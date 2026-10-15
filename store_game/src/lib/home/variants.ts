export const VARIANTS = ['a', 'b', 'c'] as const
export type Variant = (typeof VARIANTS)[number]

export const isVariant = (value: string): value is Variant =>
  (VARIANTS as readonly string[]).includes(value)

/**
 * The three homepage concepts share one component tree and one data layer.
 * A variant is a set of values, never a forked branch: adding a fourth
 * concept must not mean copying HomeView.
 */
export interface VariantConfig {
  readonly id: Variant
  readonly label: string
  /** Tailwind classes for the hero, which is the main point of difference. */
  readonly hero: {
    readonly minHeight: string
    readonly showSecondaryCta: boolean
    readonly overlay: string
  }
  /** Featured shelf: a horizontal snap rail versus a grid. */
  readonly featured: {
    readonly layout: 'rail' | 'grid'
    readonly cardAspect: string
  }
  readonly glow: {
    readonly enabled: boolean
    readonly className: string
  }
}

export const VARIANT_CONFIG: Record<Variant, VariantConfig> = {
  a: {
    id: 'a',
    label: 'แนวคอนเซปต์ A',
    hero: {
      minHeight: 'min-h-[420px] md:min-h-[520px]',
      showSecondaryCta: false,
      overlay: 'from-ink/95 via-ink/80 to-ink/40',
    },
    featured: { layout: 'rail', cardAspect: 'aspect-[4/3] lg:aspect-[16/10]' },
    glow: { enabled: false, className: '' },
  },
  b: {
    id: 'b',
    label: 'แนวคอนเซปต์ B',
    hero: {
      minHeight: 'min-h-[520px] md:min-h-[640px]',
      showSecondaryCta: true,
      overlay: 'from-ink/90 via-ink/70 to-ink/30',
    },
    featured: { layout: 'rail', cardAspect: 'aspect-[3/4] lg:aspect-[4/5]' },
    glow: { enabled: true, className: 'ring-1 ring-primary/20' },
  },
  c: {
    id: 'c',
    label: 'แนวคอนเซปต์ C',
    hero: {
      minHeight: 'min-h-[380px] md:min-h-[460px]',
      showSecondaryCta: false,
      overlay: 'from-ink/98 via-ink/85 to-ink/60',
    },
    featured: { layout: 'grid', cardAspect: 'aspect-[4/3] lg:aspect-[16/10]' },
    glow: { enabled: true, className: 'shadow-[0_0_0_1px_rgba(225,29,46,0.25)]' },
  },
}

/** The variant whose styling actually ships. The other two remain reachable
 *  at /concept/b and /concept/c as running routes. */
export const SHIPPED_VARIANT: Variant = 'a'

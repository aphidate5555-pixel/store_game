import Link from 'next/link'
import { ArrowRight, MessageCircle, Sparkles } from 'lucide-react'

import { HeroArtworkFallback, ImageWithFallback } from '@/components/ui/image-with-fallback'
import { getMessages } from '@/lib/i18n'
import { SITE_DEFAULTS } from '@/lib/i18n/th/defaults'
import { resolveRouteKey, type RouteKey } from '@/lib/validation/route-keys'
import { brandMediaUrl } from '@/lib/storage/media-url'
import { storeName } from '@/lib/catalog/seo'
import type { Database } from '@/lib/database.types'
import type { Variant } from '@/lib/home/variants'
import { VARIANT_CONFIG } from '@/lib/home/variants'
import { sectionPayload } from '@/lib/catalog/site-content'

type SectionRow = Database['public']['Tables']['site_sections']['Row']
type SettingsRow = Database['public']['Tables']['store_settings']['Row']

/**
 * Wide Gaming Marketplace Hero Banner.
 *
 * Renders the administrator-uploaded banner artwork (`hero.image_path`) with a
 * readable dark gradient overlay and falls back to `HeroArtworkFallback` when
 * no banner is configured or if image loading fails.
 */
export function Hero({
  sections,
  variant,
  settings,
}: {
  sections: readonly SectionRow[]
  variant: Variant
  settings?: SettingsRow
}) {
  const m = getMessages()
  const config = VARIANT_CONFIG[variant]
  const payload = sectionPayload(sections, 'hero')

  const shopName = settings ? storeName(settings) : null
  const shopIntro = settings?.store_description ?? null

  const title =
    typeof payload.title === 'string' && payload.title.trim()
      ? payload.title
      : SITE_DEFAULTS.hero.title
  const subtitle =
    typeof payload.subtitle === 'string' && payload.subtitle.trim()
      ? payload.subtitle
      : shopIntro || SITE_DEFAULTS.hero.subtitle
  const ctaText =
    typeof payload.cta_text === 'string' && payload.cta_text.trim()
      ? payload.cta_text
      : SITE_DEFAULTS.hero.cta_text

  // F-13: the destination is a route key from the registry, never a typed URL.
  const ctaHref =
    resolveRouteKey(
      (typeof payload.cta_route === 'string' ? payload.cta_route : 'products') as RouteKey,
    ) ?? '/products'

  const image =
    typeof payload.image_path === 'string' && payload.image_path
      ? brandMediaUrl(payload.image_path)
      : null

  return (
    <section
      aria-label={title}
      className={`relative overflow-hidden border-b border-line bg-ink ${config.hero.minHeight}`}
    >
      {/* Background artwork with automatic fallback */}
      <ImageWithFallback
        src={image}
        alt={m.hero.fallbackAlt}
        priority
        sizes="100vw"
        className="object-cover object-center"
        fallback={<HeroArtworkFallback />}
      />

      {/* Readable multi-stop dark gaming overlay */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/40`}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 bg-gradient-to-t ${config.hero.overlay}`}
      />

      <div className="relative mx-auto flex h-full max-w-6xl flex-col justify-center px-4 py-12 md:py-16 lg:py-20">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles size={13} aria-hidden="true" />
              {m.hero.badge}
            </span>
            {shopName ? (
              <span className="inline-flex items-center rounded-full border border-accent/35 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                {shopName}
              </span>
            ) : null}
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-text sm:text-4xl md:text-5xl">
            {title}
          </h1>

          {subtitle ? (
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-text-2 sm:text-base md:text-lg">
              {subtitle}
            </p>
          ) : null}

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href={ctaHref}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-base font-semibold text-on-primary shadow-lg shadow-primary/20 transition-[background-color,transform] duration-micro hover:brightness-95 active:translate-y-px focus-ring"
            >
              {ctaText}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>

            {config.hero.showSecondaryCta ? (
              <Link
                href="/contact"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line-ctl bg-surface/90 px-6 text-base font-medium text-text backdrop-blur-xs transition-colors duration-micro hover:border-primary/50 hover:bg-surface-2 focus-ring"
              >
                <MessageCircle size={18} className="text-accent" aria-hidden="true" />
                {m.hero.secondaryCta}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}

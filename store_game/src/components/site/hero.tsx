import Image from 'next/image'
import Link from 'next/link'

import { getMessages } from '@/lib/i18n'
import { resolveRouteKey, type RouteKey } from '@/lib/validation/route-keys'
import { brandMediaUrl } from '@/lib/storage/media-url'
import type { Database } from '@/lib/database.types'
import type { Variant } from '@/lib/home/variants'
import { VARIANT_CONFIG } from '@/lib/home/variants'
import { sectionPayload } from '@/lib/catalog/site-content'

type SectionRow = Database['public']['Tables']['site_sections']['Row']

/**
 * The hero. One component, three looks: the `variant` prop selects values
 * from VARIANT_CONFIG and nothing else, so the three concept routes cannot
 * drift apart in behaviour (the plan's rule against forking logic).
 */
export function Hero({
  sections,
  variant,
}: {
  sections: readonly SectionRow[]
  variant: Variant
}) {
  const m = getMessages()
  const config = VARIANT_CONFIG[variant]
  const payload = sectionPayload(sections, 'hero')

  const title = typeof payload.title === 'string' && payload.title ? payload.title : m.hero.title
  const subtitle =
    typeof payload.subtitle === 'string' && payload.subtitle ? payload.subtitle : m.hero.subtitle
  const ctaText =
    typeof payload.cta_text === 'string' && payload.cta_text ? payload.cta_text : m.hero.title

  // F-13: the destination is a route key from the registry, never a typed URL.
  const ctaHref =
    resolveRouteKey((typeof payload.cta_route === 'string' ? payload.cta_route : 'games') as RouteKey) ??
    '/games'

  const image = typeof payload.image_path === 'string' ? brandMediaUrl(payload.image_path) : null

  return (
    <section className={`relative overflow-hidden ${config.hero.minHeight}`}>
      {image ? (
        <Image
          src={image}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      ) : null}

      {/* Decorative: the copy below carries the meaning, so this must not be
          announced and must not intercept pointer events. */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 bg-gradient-to-b ${config.hero.overlay}`}
      />

      <div className="relative mx-auto flex h-full max-w-6xl flex-col justify-end px-4 pb-10 pt-20">
        <p className="inline-flex w-fit items-center rounded-full border border-line bg-surface/80 px-3 py-1 text-xs text-text-2">
          {m.hero.badge}
        </p>

        <h1 className="mt-4 max-w-2xl text-2xl font-bold leading-tight text-text md:text-4xl">
          {title}
        </h1>

        {subtitle ? (
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-text-2 md:text-base">
            {subtitle}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={ctaHref}
            className="inline-flex min-h-12 items-center justify-center rounded-lg bg-primary px-6 text-base font-medium text-on-primary transition-[background-color,transform] duration-micro hover:brightness-95 active:translate-y-px focus-ring"
          >
            {ctaText}
          </Link>

          {config.hero.showSecondaryCta ? (
            <Link
              href="/products"
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-line bg-surface/80 px-6 text-base font-medium text-text hover:border-line-ctl focus-ring"
            >
              {m.hero.secondaryCta}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  )
}

'use client'

import { useState, type ReactNode } from 'react'
import Image from 'next/image'
import { Gamepad2, Shield, Sparkles, Swords, Trophy } from 'lucide-react'

/**
 * Resilient image wrapper that falls back to a rich Gaming Artwork visual
 * when `src` is null or when the remote image fails to load.
 * Never renders a blank frame or a broken browser image icon.
 */
export function ImageWithFallback({
  src,
  alt,
  sizes = '100vw',
  priority = false,
  className = 'object-cover',
  fallback,
}: {
  src: string | null | undefined
  alt: string
  sizes?: string
  priority?: boolean
  className?: string
  fallback: ReactNode
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  if (!src || failedSrc === src) {
    return <>{fallback}</>
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
      onError={() => setFailedSrc(src)}
    />
  )
}

/**
 * Wide Gaming Marketplace Hero Banner fallback artwork.
 * Rendered when the administrator has not uploaded a custom banner or if the
 * banner image fails to load.
 */
export function HeroArtworkFallback() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden bg-ink"
    >
      {/* Layered dark gaming atmospheric gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_75%_30%,rgba(225,29,46,0.28),transparent_70%),radial-gradient(ellipse_60%_50%_at_20%_80%,rgba(245,158,11,0.14),transparent_65%)]" />

      {/* Precision tactical grid */}
      <svg
        className="absolute inset-0 size-full opacity-20"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern id="hero-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path
              d="M 48 0 L 0 0 0 48"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="text-line-ctl"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-grid)" />
      </svg>

      {/* Stylized Gaming Crest on the right side for desktop */}
      <div className="pointer-events-none absolute -right-12 top-1/2 hidden -translate-y-1/2 lg:flex lg:items-center lg:gap-6 xl:right-12">
        <div className="relative flex size-64 items-center justify-center rounded-3xl border border-primary/30 bg-surface/60 shadow-2xl backdrop-blur-md">
          <div className="absolute inset-3 rounded-2xl border border-accent/20" />
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="grid size-20 place-items-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/40">
              <Swords size={42} />
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
              <Trophy size={13} />
              <span>PREMIUM ACCOUNTS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Game Category cover fallback artwork, tailored by slug/name so every game
 * card looks like a rich gaming tile even before an admin uploads a cover.
 */
export function CategoryArtworkFallback({
  slug,
  name,
}: {
  slug?: string | null
  name: string
}) {
  const key = (slug ?? name).toLowerCase()
  const isMoba = key.includes('legend') || key.includes('rov') || key.includes('moba')
  const isShooter = key.includes('fire') || key.includes('pubg') || key.includes('point')

  const accentGradient = isMoba
    ? 'from-primary/35 via-surface-2 to-ink'
    : isShooter
      ? 'from-accent/30 via-surface-2 to-ink'
      : 'from-primary/25 via-surface-3 to-ink'

  const Icon = isMoba ? Swords : isShooter ? Shield : Gamepad2

  return (
    <div
      aria-hidden="true"
      className={`relative flex size-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br ${accentGradient} p-4`}
    >
      <div className="absolute -right-6 -top-6 size-24 rounded-full bg-primary/15 blur-xl" />
      <div className="absolute -bottom-6 -left-6 size-24 rounded-full bg-accent/10 blur-xl" />
      <div className="relative grid size-12 place-items-center rounded-xl border border-line-ctl bg-ink/70 text-primary shadow-md">
        <Icon size={24} />
      </div>
      <span className="relative mt-2 line-clamp-1 max-w-full px-2 text-center text-xs font-bold tracking-wider text-text-2 uppercase">
        {name}
      </span>
    </div>
  )
}

/**
 * Product Card cover fallback artwork when a product has no uploaded image or
 * the image fails to load.
 */
export function ProductArtworkFallback({
  code,
  gameName,
}: {
  code: string
  gameName?: string | null
}) {
  return (
    <div
      aria-hidden="true"
      className="relative flex size-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-surface-3 via-surface-2 to-ink p-4 text-center"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(225,29,46,0.18),transparent_65%)]" />
      <div className="relative grid size-11 place-items-center rounded-xl border border-line-ctl bg-surface/90 text-primary">
        <Sparkles size={20} />
      </div>
      {gameName ? (
        <span className="relative mt-2 line-clamp-1 text-xs font-semibold text-text-2">
          {gameName}
        </span>
      ) : null}
      <span className="relative mt-0.5 font-mono text-xs text-text-3">{code}</span>
    </div>
  )
}

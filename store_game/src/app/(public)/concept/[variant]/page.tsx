import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { HomeView } from '@/components/home/home-view'
import { VARIANTS, isVariant } from '@/lib/home/variants'

/**
 * One route for all three concepts.
 *
 * `dynamicParams = false` makes /concept/anything 404 without a manual guard,
 * and generateStaticParams pre-renders exactly the three that exist. The
 * layout is force-dynamic anyway, so this decides the route set rather than
 * the caching behaviour.
 *
 * The pages are noindex: they exist to compare designs, and three URLs with
 * the same content would compete with the real homepage.
 */
export function generateStaticParams(): { variant: string }[] {
  return VARIANTS.map((variant) => ({ variant }))
}

export const dynamicParams = false

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function ConceptPage({
  params,
}: {
  params: Promise<{ variant: string }>
}) {
  const { variant } = await params
  if (!isVariant(variant)) notFound()
  return <HomeView variant={variant} />
}

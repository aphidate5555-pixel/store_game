import type { Metadata } from 'next'

import type { Database } from '@/lib/database.types'
import type { Messages } from '@/lib/i18n'

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
)

/** Used only when the administrator has not set a store name yet. */
export const FALLBACK_STORE_NAME = 'ร้านคีย์เกม'

type Settings = Database['public']['Tables']['store_settings']['Row']

/** The store name always comes from the database, never from a hardcoded
 *  literal, so renaming the store in the admin updates every title at once. */
export const storeName = (settings: Settings): string => {
  const name = settings.store_name?.trim()
  return name && name.length > 0 ? name : FALLBACK_STORE_NAME
}

export function absolute(path?: string | null): string | undefined {
  if (!path) return undefined
  if (/^https?:\/\//i.test(path)) return path
  return new URL(path, SITE_URL).toString()
}

/**
 * The icon is served from src/app/icon/route.tsx and is the only favicon
 * source in the project, so no `icons` field is declared here (C-35).
 */
export function buildRootMetadata(settings: Settings, messages: Messages): Metadata {
  const name = storeName(settings)
  const ogImage = absolute(settings.default_og_image_path)

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: settings.seo_title?.trim() || name,
      template: messages.meta.titleTemplate(name),
    },
    description: settings.seo_description?.trim() || messages.meta.defaultDescription,
    applicationName: name,
    alternates: {
      canonical: '/',
      languages: { 'th-TH': '/', 'x-default': '/' },
    },
    openGraph: {
      type: 'website',
      siteName: name,
      locale: 'th_TH',
      title: settings.seo_title?.trim() || name,
      url: '/',
      ...(ogImage
        ? { images: [{ url: ogImage, width: 1200, height: 630, alt: name }] }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: settings.seo_title?.trim() || name,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
    },
    formatDetection: { telephone: false },
  }
}

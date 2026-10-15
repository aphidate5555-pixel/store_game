import { ImageResponse } from 'next/og'

import { fetchSiteConfig } from '@/lib/settings/query'
import { storeName } from '@/lib/catalog/seo'
import { brandMediaUrl } from '@/lib/storage/media-url'

/**
 * The iOS home-screen icon.
 *
 * Separate from src/app/icon/route.tsx rather than shared: iOS does not
 * accept transparency in this icon and applies its own rounding, so an SVG or
 * a transparent PNG renders with a black box behind it on some devices.
 * That is why branding.ts refuses .ico as well — this renderer cannot
 * decode it.
 */
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export async function GET(): Promise<Response> {
  let iconUrl: string | null = null
  let name = 'คีย์'

  try {
    const config = await fetchSiteConfig()
    iconUrl = brandMediaUrl(config.settings.favicon_path)
    name = storeName(config.settings)
  } catch {
    // Fall through to the generated mark.
  }

  if (iconUrl) {
    return Response.redirect(iconUrl, 302)
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          // Opaque on purpose — see the note above.
          background: '#E11D2E',
          color: '#FFFFFF',
          fontSize: 96,
          fontWeight: 700,
        }}
      >
        {name.slice(0, 1)}
      </div>
    ),
    { ...size },
  )
}

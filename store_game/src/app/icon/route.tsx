import { ImageResponse } from 'next/og'

import { fetchSiteConfig } from '@/lib/settings/query'
import { storeName } from '@/lib/catalog/seo'
import { brandMediaUrl } from '@/lib/storage/media-url'

/**
 * The favicon, and the only source of one (C-35).
 *
 * A dynamic route rather than a static file, because the store's icon is
 * uploaded at runtime. The earlier arrangement declared `icons` in the root
 * metadata AND shipped a static file, which left two sources and whichever
 * one the browser had cached — so a new logo took minutes to appear.
 *
 * There is deliberately no `export const dynamic = 'force-static'` here: the
 * cached header would be exactly the bug this file exists to fix.
 */
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export async function GET(): Promise<Response> {
  let iconUrl: string | null = null
  let name = 'คีย์'

  try {
    const config = await fetchSiteConfig()
    iconUrl = brandMediaUrl(config.settings.favicon_path)
    name = storeName(config.settings)
  } catch {
    // No config — the fallback below renders instead of the request failing.
  }

  if (iconUrl) {
    // Redirect to the CDN rather than proxying the bytes: the asset is
    // already public and cached there, and proxying it would spend this
    // function's bandwidth on every favicon request.
    return Response.redirect(iconUrl, 302)
  }

  // The default mark: a rounded square in the brand red with the store's
  // first letter. Generated rather than shipped, so there is one less binary
  // in the repository and it always matches the fallback palette.
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#E11D2E',
          borderRadius: 8,
          color: '#FFFFFF',
          fontSize: 20,
          fontWeight: 700,
        }}
      >
        {name.slice(0, 1)}
      </div>
    ),
    { ...size },
  )
}

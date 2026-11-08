import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { ImageResponse } from 'next/og'

import { fetchSiteConfig } from '@/lib/settings/query'
import { storeName } from '@/lib/catalog/seo'
import { brandMediaUrl } from '@/lib/storage/media-url'
import { isMaintenanceActive } from '@/lib/catalog/sitemap-data'

/**
 * The social preview image.
 *
 * Fonts are the whole difficulty here. satori ships with a Latin-only face,
 * so a Thai store name renders as tofu boxes — which is worse than no image,
 * because the preview still looks designed. The Noto Sans Thai files are
 * therefore bundled rather than fetched: a runtime fetch from a font CDN
 * would add a network round trip to every share render and would fail
 * whenever that CDN is unreachable.
 *
 * Put the .ttf files in src/assets/fonts/ (SIL Open Font License 1.1,
 * Google Fonts). **ttf, otf or woff — never woff2**, which satori cannot
 * decode. Until the files are present the route falls back to the system
 * stack, which renders Latin correctly and Thai as tofu; that is a visible
 * gap rather than a silent one, and the comment below records it.
 */
async function loadFont(weight: 400 | 700): Promise<ArrayBuffer | null> {
  // Resolved at request time rather than with `new URL(..., import.meta.url)`:
  // webpack turns that form into a static module reference, so a missing font
  // file fails the production build instead of falling back. The path is
  // built by hand and read through the filesystem, which keeps the fallback
  // working whether or not the TTF has been added yet.
  const name = weight === 700 ? 'NotoSansThai-Bold.ttf' : 'NotoSansThai-Regular.ttf'
  const path = join(process.cwd(), 'src', 'assets', 'fonts', name)

  try {
    const file = await readFile(path)
    return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer
  } catch {
    return null
  }
}

export const runtime = 'nodejs'
export const alt = 'ภาพแชร์ของร้าน'
export const contentType = 'image/png'
export const size = { width: 1200, height: 630 }

export async function GET(): Promise<Response> {
  // C-29: during maintenance the preview must not advertise a storefront
  // nobody can reach.
  if (await isMaintenanceActive()) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#08080A',
            color: '#A8A8B3',
            fontSize: 48,
          }}
        >
          <div style={{ color: '#F5F5F7', fontWeight: 700, marginBottom: 16 }}>
            เว็บไซต์กำลังปรับปรุง
          </div>
          <div style={{ fontSize: 28 }}>กรุณาเข้าเว็บไซต์อีกครั้งภายหลัง</div>
        </div>
      ),
      { ...size },
    )
  }

  let name = 'ร้านไอดีเกม'
  let description = 'คัดลอกรหัสสินค้าแล้วทักมาทาง WhatsApp ส่งมอบไว'
  let logoUrl: string | null = null
  let primary = '#E11D2E'

  try {
    const config = await fetchSiteConfig()
    name = storeName(config.settings)
    description = config.settings.store_description || description
    primary = config.settings.primary_color || primary
    logoUrl = brandMediaUrl(config.settings.default_og_image_path ?? config.settings.logo_path)
  } catch {
    // Defaults above are already renderable.
  }

  const [regular, bold] = await Promise.all([loadFont(400), loadFont(700)])

  const fonts: Array<{ name: string; data: ArrayBuffer; weight: 400 | 700; style: 'normal' }> = []
  if (regular) fonts.push({ name: 'NotoThai', data: regular, weight: 400, style: 'normal' })
  if (bold) fonts.push({ name: 'NotoThai', data: bold, weight: 700, style: 'normal' })

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#08080A',
          padding: 72,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- satori needs a plain img
            <img src={logoUrl} width={72} height={72} alt="" />
          ) : (
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 16,
                background: primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontSize: 36,
              }}
            >
              {name.slice(0, 1)}
            </div>
          )}
          <div style={{ color: '#F5F5F7', fontSize: 34 }}>{name}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ color: '#F5F5F7', fontSize: 72, fontWeight: 700, lineHeight: 1.2 }}>
            ไอดีเกมพร้อมเล่น
          </div>
          <div style={{ color: '#A8A8B3', fontSize: 32, marginTop: 20 }}>{description}</div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          {['MOBILE LEGENDS', 'FREE FIRE', 'ROV', 'PUBG MOBILE'].map((game) => (
            <div
              key={game}
              style={{
                border: '1px solid #343440',
                borderRadius: 999,
                padding: '10px 24px',
                color: '#A8A8B3',
                fontSize: 24,
              }}
            >
              {game}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      ...(fonts.length > 0 ? { fonts } : {}),
    },
  )
}

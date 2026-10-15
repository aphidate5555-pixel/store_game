import { Noto_Sans_Thai } from 'next/font/google'

/**
 * Thai type, self-hosted by next/font: the browser fetches from the same
 * origin, so there is no third-party request at runtime and no
 * render-blocking round trip to a font CDN.
 *
 * `swap` matters more than usual here — without it, a visitor on a slow
 * connection sees an empty page while the Thai font downloads, which for a
 * text-first catalogue is the entire content.
 */
export const thai = Noto_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-thai',
  fallback: ['system-ui', 'sans-serif'],
})

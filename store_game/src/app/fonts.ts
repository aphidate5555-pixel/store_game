import localFont from 'next/font/local'

/**
 * Thai type, self-hosted by next/font/local: the browser fetches from the same
 * origin, so there is no third-party request at runtime or build time and no
 * render-blocking round trip to a font CDN.
 *
 * `swap` matters more than usual here — without it, a visitor on a slow
 * connection sees an empty page while the Thai font downloads, which for a
 * text-first catalogue is the entire content.
 */
export const thai = localFont({
  src: [
    {
      path: '../assets/fonts/NotoSansThai-Variable-thai.woff2',
      weight: '400 700',
      style: 'normal',
    },
    {
      path: '../assets/fonts/NotoSansThai-Variable-latin.woff2',
      weight: '400 700',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-thai',
  fallback: ['system-ui', 'sans-serif'],
})

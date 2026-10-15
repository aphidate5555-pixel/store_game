import type { ReactNode } from 'react'
import type { Metadata } from 'next'

import { thai } from './fonts'
import './globals.css'
import { fetchSiteConfig } from '@/lib/settings/query'
import { brandCssBlock, cssBlockToStyle } from '@/lib/settings/brand-css'
import { buildRootMetadata } from '@/lib/catalog/seo'
import { getMessages } from '@/lib/i18n'

/**
 * The brand colours are inlined into <html style="…">, which means this
 * layout has to see the latest values on every request. force-dynamic is
 * therefore required, and the consequence — public HTML is not cached — is
 * accepted deliberately: a storefront showing the previous colour after an
 * administrator saved a new one reads as a broken site.
 *
 * The catalogue data underneath is still cached, by tag, at the fetch layer.
 *
 * The gate lives in (public)/layout.tsx, NOT here: this layout also wraps
 * /admin, and an administrator must be able to turn maintenance off from
 * inside the maintenance screen (C-26).
 */
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  try {
    const config = await fetchSiteConfig()
    return buildRootMetadata(config.settings, getMessages())
  } catch {
    // Fail closed. Returning a minimal metadata object keeps the maintenance
    // screen indexable-suppressed rather than crashing the render.
    const messages = getMessages()
    return {
      title: messages.maintenance.metaTitle,
      description: messages.maintenance.metaDescription,
      robots: { index: false, follow: false },
    }
  }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  // React's style prop takes a mapping of properties to values, not a
  // declaration string. brandCssBlock still returns the validated text, and
  // cssBlockToStyle parses only what that gate has already accepted.
  let style: Record<string, string> = {}

  try {
    const config = await fetchSiteConfig()
    style = cssBlockToStyle(
      brandCssBlock(config.settings.primary_color, config.settings.accent_color),
    )
  } catch {
    // No config: the maintenance screen renders with the token defaults from
    // globals.css, which is why every variable there has a literal fallback.
  }

  return (
    <html lang="th" className={thai.variable} style={style}>
      <head>
        {/*
          One line, inline, before paint. Anything hidden with opacity-0 waits
          for data-js, so without JavaScript the content is visible rather than
          invisible — see the [data-js] rule in globals.css.

          The body is a string literal with no interpolation, so no value from
          the database can reach it. The structured data blocks are emitted by
          the pages that own them, through ldJson(); the root layout does not
          carry one, because a WebSite node on every URL is noise.
        */}
        <script
          /* eslint-disable-next-line react/no-danger -- literal string, no interpolated value */
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.setAttribute('data-js','true')`,
          }}
        />
      </head>
      <body className="min-h-svh bg-ink text-text antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:left-4 focus:top-4 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-on-primary"
        >
          ข้ามไปยังเนื้อหา
        </a>
        {children}
      </body>
    </html>
  )
}

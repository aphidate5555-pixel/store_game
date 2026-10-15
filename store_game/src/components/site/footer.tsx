import Link from 'next/link'

import { getMessages } from '@/lib/i18n'
import { storeName } from '@/lib/catalog/seo'
import { formatDateTime } from '@/lib/format/date'
import { buildFooterLinks, buildNavItems } from './navigation'
import type { Database } from '@/lib/database.types'

type SettingsRow = Database['public']['Tables']['store_settings']['Row']
type SectionRow = Database['public']['Tables']['site_sections']['Row']

export function SiteFooter({
  settings,
  sections,
}: {
  settings: SettingsRow
  sections: readonly SectionRow[]
}) {
  const m = getMessages()
  const { internal, social } = buildFooterLinks(settings, sections)
  const navItems = buildNavItems(sections)
  const payload = sections.find((s) => s.section_key === 'footer')?.payload
  const flags = (typeof payload === 'object' && payload !== null ? payload : {}) as Record<
    string,
    unknown
  >

  // Rendered on the server so the year cannot differ between the build and
  // the visit, and so the locale is the pinned one rather than the visitor's.
  const year = new Date().getUTCFullYear()

  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <p className="text-sm font-semibold text-text">{storeName(settings)}</p>
            {flags.show_about !== false && settings.store_description ? (
              <p className="mt-2 text-sm leading-relaxed text-text-2">{settings.store_description}</p>
            ) : null}
            {settings.business_hours ? (
              <p className="mt-3 text-sm text-text-2">
                <span className="text-text-3">{m.contact.hours}: </span>
                {settings.business_hours}
              </p>
            ) : null}
          </div>

          <nav aria-label={m.footer.navigationLabel}>
            <p className="text-sm font-semibold text-text">{m.footer.games}</p>
            <ul className="mt-2 space-y-1">
              {internal.map((link) => (
                <li key={`${link.label}-${link.href}`}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-11 items-center text-sm text-text-2 hover:text-text focus-ring rounded"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              {navItems
                .filter((item) => item.href === '/products')
                .map((item) => (
                  <li key={`nav-${item.href}`}>
                    <Link
                      href={item.href}
                      className="inline-flex min-h-11 items-center text-sm text-text-2 hover:text-text focus-ring rounded"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
            </ul>
          </nav>

          {flags.show_social !== false && social.length > 0 ? (
            <div>
              <p className="text-sm font-semibold text-text">{m.footer.follow}</p>
              <ul className="mt-2 space-y-1">
                {social.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center text-sm text-text-2 hover:text-text focus-ring rounded"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {/*
          The disclaimer is not decoration. Without it a visitor can read the
          site as a checkout that takes money, and it is not: ordering happens
          entirely in WhatsApp.
        */}
        {flags.show_disclaimer !== false && settings.footer_disclaimer ? (
          <div className="mt-8 rounded-lg border border-line bg-surface-2 p-4">
            <p className="text-xs font-medium text-text-2">{m.footer.disclaimerLabel}</p>
            <p className="mt-1 text-xs leading-relaxed text-text-3">
              {settings.footer_disclaimer}
            </p>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
          <p className="text-xs text-text-3">{m.footer.rights(year, storeName(settings))}</p>
          {settings.footer_text ? (
            <p className="text-xs text-text-3">{settings.footer_text}</p>
          ) : null}
        </div>
      </div>
    </footer>
  )
}

export { formatDateTime }

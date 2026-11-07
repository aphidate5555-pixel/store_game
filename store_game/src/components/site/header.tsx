import Image from 'next/image'
import Link from 'next/link'
import { MessageCircle, Search } from 'lucide-react'

import { getMessages } from '@/lib/i18n'
import { storeName } from '@/lib/catalog/seo'
import { safeStoreWhatsAppUrl } from '@/lib/catalog/whatsapp'
import { buildNavItems, navPayload, storeLogoUrl, type NavItem } from './navigation'
import { MobileNavMenu } from './mobile-nav-menu'
import type { Database } from '@/lib/database.types'

type SettingsRow = Database['public']['Tables']['store_settings']['Row']
type SectionRow = Database['public']['Tables']['site_sections']['Row']

export function SiteHeader({
  settings,
  sections,
}: {
  settings: SettingsRow
  sections: readonly SectionRow[]
}) {
  const m = getMessages()
  const items = buildNavItems(sections)
  const flags = navPayload(sections)
  const logo = storeLogoUrl(settings)
  const name = storeName(settings)
  const whatsappHref = flags.showWhatsapp ? safeStoreWhatsAppUrl(settings) : null

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 rounded-lg focus-ring"
          aria-label={name}
        >
          {logo ? (
            <Image
              src={logo}
              alt=""
              width={36}
              height={36}
              className="size-9 rounded-lg object-cover ring-1 ring-line-ctl"
            />
          ) : (
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-lg bg-primary text-sm font-bold text-on-primary shadow-sm shadow-primary/30"
            >
              {name.slice(0, 1)}
            </span>
          )}
          <span className="max-w-[11rem] truncate text-sm font-bold tracking-tight text-text sm:max-w-none sm:text-base">
            {name}
          </span>
        </Link>

        <nav aria-label="เมนูหลัก" className="ml-auto hidden md:block">
          <ul className="flex items-center gap-1">
            {items.map((item: NavItem) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-11 items-center rounded-lg px-3.5 text-sm font-medium text-text-2 transition-colors duration-micro hover:bg-surface-2 hover:text-text focus-ring"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1.5 md:ml-2">
          {flags.showSearch ? (
            <Link
              href="/products"
              aria-label={m.search.label}
              className="grid size-11 place-items-center rounded-lg text-text-2 transition-colors duration-micro hover:bg-surface-2 hover:text-text focus-ring"
            >
              <Search size={20} aria-hidden="true" />
            </Link>
          ) : null}

          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden min-h-10 items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/15 px-3.5 text-xs font-semibold text-primary transition-colors duration-micro hover:bg-primary hover:text-on-primary sm:inline-flex focus-ring"
            >
              <MessageCircle size={15} aria-hidden="true" />
              {m.whatsapp.floating}
            </a>
          ) : null}

          <MobileNavMenu
            items={items}
            showSearch={flags.showSearch}
            whatsappHref={whatsappHref}
          />
        </div>
      </div>
    </header>
  )
}

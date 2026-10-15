import Image from 'next/image'
import Link from 'next/link'
import { Search } from 'lucide-react'

import { getMessages } from '@/lib/i18n'
import { storeName } from '@/lib/catalog/seo'
import { buildNavItems, navPayload, storeLogoUrl, type NavItem } from './navigation'
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

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 focus-ring rounded-lg"
          aria-label={name}
        >
          {logo ? (
            <Image
              src={logo}
              alt=""
              width={36}
              height={36}
              className="size-9 rounded-lg object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-lg bg-primary text-sm font-bold text-on-primary"
            >
              {name.slice(0, 1)}
            </span>
          )}
          <span className="hidden text-sm font-semibold text-text sm:inline">{name}</span>
        </Link>

        <nav aria-label="เมนูหลัก" className="ml-auto hidden md:block">
          <ul className="flex items-center gap-1">
            {items.map((item: NavItem) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm text-text-2 transition-colors duration-micro hover:bg-surface-2 hover:text-text focus-ring"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          {flags.showSearch ? (
            <Link
              href="/products"
              aria-label={m.search.label}
              className="grid size-11 place-items-center rounded-lg text-text-2 hover:bg-surface-2 hover:text-text focus-ring"
            >
              <Search size={20} aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  )
}

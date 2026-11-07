'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, MessageCircle, Search, X } from 'lucide-react'

import { BottomSheet } from '@/components/ui/bottom-sheet'
import { getMessages } from '@/lib/i18n'
import type { NavItem } from './navigation'

export function MobileNavMenu({
  items,
  showSearch,
  whatsappHref,
}: {
  items: readonly NavItem[]
  showSearch: boolean
  whatsappHref: string | null
}) {
  const m = getMessages()
  const [open, setOpen] = useState(false)

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={m.nav.openMenu}
        aria-expanded={open}
        aria-controls="mobile-nav-sheet"
        className="grid size-11 place-items-center rounded-lg text-text-2 hover:bg-surface-2 hover:text-text focus-ring"
      >
        {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
      </button>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={m.nav.menu}
        labelledBy="mobile-nav-sheet"
      >
        <nav aria-label={m.nav.menu} className="space-y-2">
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center rounded-lg px-3 text-base font-medium text-text hover:bg-surface-2 focus-ring"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          {showSearch ? (
            <div className="border-t border-line pt-3">
              <Link
                href="/products"
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 text-sm font-medium text-text hover:border-line-ctl focus-ring"
              >
                <Search size={16} aria-hidden="true" />
                {m.search.placeholder}
              </Link>
            </div>
          ) : null}

          {whatsappHref ? (
            <div className="pt-2">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary focus-ring"
              >
                <MessageCircle size={16} aria-hidden="true" />
                {m.whatsapp.storeCta}
              </a>
            </div>
          ) : null}
        </nav>
      </BottomSheet>
    </div>
  )
}

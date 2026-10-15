import Link from 'next/link'

import { getMessages } from '@/lib/i18n'
import { safeStoreWhatsAppUrl, type WhatsAppStore } from '@/lib/catalog/whatsapp'

export function WhatsAppCta({ store }: { store: WhatsAppStore }) {
  const m = getMessages()
  const href = safeStoreWhatsAppUrl(store)

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="rounded-xl border border-line bg-surface p-6 text-center md:p-10">
        <h2 className="text-lg font-semibold text-text">{m.whatsapp.storeCta}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-2">
          {m.whatsapp.manualHint}
        </p>

        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex min-h-12 items-center justify-center rounded-lg bg-primary px-6 text-base font-medium text-on-primary hover:brightness-95 focus-ring"
          >
            {m.whatsapp.storeCta}
          </a>
        ) : (
          <p className="mt-5 text-sm text-text-3">{m.whatsapp.missingBody}</p>
        )}

        <p className="mt-4 text-xs text-text-3">
          <Link href="/contact" className="underline underline-offset-4 focus-ring rounded">
            {m.contact.heading}
          </Link>
        </p>
      </div>
    </section>
  )
}

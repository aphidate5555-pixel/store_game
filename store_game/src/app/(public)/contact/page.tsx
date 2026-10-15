import type { Metadata } from 'next'

import { SiteHeader } from '@/components/site/header'
import { SiteFooter } from '@/components/site/footer'
import { ToastProvider } from '@/components/ui/toast'
import { fetchSiteConfig } from '@/lib/settings/query'
import { getMessages } from '@/lib/i18n'
import { SITE_URL } from '@/lib/catalog/seo'
import { safeStoreWhatsAppUrl } from '@/lib/catalog/whatsapp'
import { buildFooterLinks } from '@/components/site/navigation'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const m = getMessages()
  return {
    title: m.seo.contactTitle,
    description: m.seo.contactDescription,
    alternates: {
      canonical: '/contact',
      languages: { 'th-TH': '/contact', 'x-default': '/contact' },
    },
    openGraph: {
      type: 'website',
      locale: 'th_TH',
      title: m.seo.contactTitle,
      description: m.seo.contactDescription,
      url: `${SITE_URL}/contact`,
    },
  }
}

export default async function ContactPage() {
  const config = await fetchSiteConfig()
  const m = getMessages()
  const settings = config.settings
  const waHref = safeStoreWhatsAppUrl(settings)
  const { social } = buildFooterLinks(settings, config.sections)

  return (
    <ToastProvider>
      <SiteHeader settings={settings} sections={config.sections} />

      <main id="main" className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-xl font-semibold text-text">{m.contact.heading}</h1>
        <p className="mt-2 text-sm leading-relaxed text-text-2">{m.contact.body}</p>

        <section className="mt-8 rounded-xl border border-line bg-surface p-5">
          <h2 className="text-base font-semibold text-text">{m.contact.channel}</h2>

          <div className="mt-3 space-y-2 text-sm">
            <p className="text-text-2">
              <span className="text-text-3">{m.contact.hours}: </span>
              {settings.business_hours || m.contact.hoursUnknown}
            </p>

            {waHref ? (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-on-primary focus-ring"
              >
                {m.whatsapp.storeCta}
              </a>
            ) : (
              <p className="text-text-3">{m.whatsapp.missingBody}</p>
            )}
          </div>
        </section>

        {/*
          The ordering steps are stated explicitly, because the single most
          common support question is what to do after pressing the button. The
          site does not send a message on the visitor's behalf and the copy
          must not imply that it does.
        */}
        <section className="mt-6 rounded-xl border border-line bg-surface p-5">
          <h2 className="text-base font-semibold text-text">{m.contact.howTo}</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-text-2">
            <li>{m.contact.step1}</li>
            <li>{m.contact.step2}</li>
            <li>{m.contact.step3}</li>
          </ol>
        </section>

        {social.length > 0 ? (
          <section className="mt-6 rounded-xl border border-line bg-surface p-5">
            <h2 className="text-base font-semibold text-text">{m.contact.social}</h2>
            <ul className="mt-3 space-y-1">
              {social.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center text-sm text-text-2 underline underline-offset-4 hover:text-text focus-ring rounded"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>

      <SiteFooter settings={settings} sections={config.sections} />
    </ToastProvider>
  )
}

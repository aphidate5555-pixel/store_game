import { SiteHeader } from '@/components/site/header'
import { SiteFooter } from '@/components/site/footer'
import { Hero } from '@/components/site/hero'
import { TrustBar } from '@/components/site/trust-bar'
import { CategoryGrid } from '@/components/site/category-grid'
import { FeaturedProducts } from '@/components/site/featured-products'
import { AllProducts } from '@/components/site/all-products'
import { WhatsAppCta } from '@/components/site/whatsapp-cta'
import { FloatingWhatsApp } from '@/components/site/floating-whatsapp'
import { ToastProvider } from '@/components/ui/toast'
import { getMessages } from '@/lib/i18n'
import { isSectionEnabled } from '@/lib/catalog/site-content'
import { getHomeData } from '@/lib/catalog/queries'
import { fetchSiteConfig } from '@/lib/settings/query'
import { safeStoreWhatsAppUrl } from '@/lib/catalog/whatsapp'
import { SHIPPED_VARIANT, type Variant } from '@/lib/home/variants'
import type { Database } from '@/lib/database.types'

type SettingsRow = Database['public']['Tables']['store_settings']['Row']
type SectionRow = Database['public']['Tables']['site_sections']['Row']

/**
 * The single homepage.
 *
 * All three concept routes render this with a different `variant`, which
 * selects presentation values from VARIANT_CONFIG and nothing else. The
 * section order comes from HOME_SECTION_ORDER and each section's visibility
 * from its payload, so enabling a section is a data change rather than a
 * code change.
 */
export async function HomeView({ variant = SHIPPED_VARIANT }: { variant?: Variant }) {
  const [config, home] = await Promise.all([fetchSiteConfig(), getHomeData()])

  const settings: SettingsRow = config.settings
  const sections: readonly SectionRow[] = config.sections

  return (
    <ToastProvider>
      <SiteHeader settings={settings} sections={sections} />

      <main id="main">
        {isSectionEnabled(sections, 'hero') ? (
          <Hero sections={sections} variant={variant} />
        ) : null}

        {isSectionEnabled(sections, 'trust') ? <TrustBar sections={sections} /> : null}

        {isSectionEnabled(sections, 'categories') ? (
          <CategoryGrid games={home.games} sections={sections} />
        ) : null}

        {isSectionEnabled(sections, 'featured_products') ? (
          <FeaturedProducts products={home.featured} sections={sections} variant={variant} />
        ) : null}

        {isSectionEnabled(sections, 'all_products') ? (
          <AllProducts products={home.latest} sections={sections} />
        ) : null}

        <WhatsAppCta store={settings} />
      </main>

      {isSectionEnabled(sections, 'footer') ? (
        <SiteFooter settings={settings} sections={sections} />
      ) : null}

      <FloatingWhatsAppSlot settings={settings} />
    </ToastProvider>
  )
}

/**
 * The URL is derived and allowlisted on the server, where the phone number
 * lives. The client component only chooses between a live link and a disabled
 * button, so a number that fails validation can never become an href.
 */
function FloatingWhatsAppSlot({ settings }: { settings: SettingsRow }) {
  const m = getMessages()
  if (!settings.floating_whatsapp_enabled) return null

  return (
    <FloatingWhatsApp
      href={safeStoreWhatsAppUrl(settings)}
      label={settings.floating_whatsapp_text || m.whatsapp.floating}
    />
  )
}

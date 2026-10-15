import type { ReactNode } from 'react'

import { fetchSiteConfig, type SiteConfig } from '@/lib/settings/query'
import { MaintenanceScreen } from '@/components/site/maintenance-screen'

/**
 * The single maintenance gate for the whole storefront.
 *
 * It sits here, above every public page, and renders before any catalogue
 * markup exists. A client component that merely hid the content would still
 * ship the product data inside the HTML — readable in devtools, and indexable
 * by Google.
 *
 * Fail-closed: if the configuration cannot be read, the visitor gets the
 * maintenance screen rather than the shop. Showing the catalogue because the
 * database had a moment of trouble is the opposite of what the switch means.
 */
export const dynamic = 'force-dynamic'

export default async function PublicLayout({ children }: { children: ReactNode }) {
  let config: SiteConfig
  try {
    config = await fetchSiteConfig()
  } catch {
    return <MaintenanceScreen isError />
  }

  if (config.maintenanceMode) {
    return <MaintenanceScreen message={config.maintenanceMessage} />
  }

  return <>{children}</>
}

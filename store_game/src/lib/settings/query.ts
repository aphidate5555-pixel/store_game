import { cache } from 'react'
import { unstable_cache } from 'next/cache'

import { TAGS } from '@/lib/cache/tags'
import { getPublicDb } from '@/lib/supabase/public-client'
import { STORE_DEFAULTS } from '@/lib/i18n/th/defaults'
import type { Database } from '@/lib/database.types'

type SettingsRow = Database['public']['Tables']['store_settings']['Row']
type SectionRow = Database['public']['Tables']['site_sections']['Row']

export interface SiteConfig {
  readonly settings: SettingsRow
  readonly sections: readonly SectionRow[]
  readonly maintenanceMode: boolean
  readonly maintenanceMessage: string
}

const DEFAULT_MAINTENANCE_MESSAGE = STORE_DEFAULTS.maintenance_message

async function runFetchSiteConfig(): Promise<SiteConfig> {
  const db = await getPublicDb('site')
  const { data, error } = await db.rpc('get_site_shell')

  if (error) {
    throw new Error('site config unavailable')
  }

  const row = data as
    | { settings?: SettingsRow | null; sections?: SectionRow[] | null }
    | null

  if (!row?.settings) {
    throw new Error('site config unavailable')
  }

  const settings: SettingsRow = { ...(STORE_DEFAULTS as Partial<SettingsRow>), ...row.settings }
  const sections = row.sections ?? []

  return {
    settings,
    sections,
    maintenanceMode: settings.maintenance_mode === true,
    maintenanceMessage: settings.maintenance_message || DEFAULT_MAINTENANCE_MESSAGE,
  }
}

/**
 * Reads settings and every section payload in one round trip via
 * get_site_shell() (C-26).
 *
 * Deliberately NOT cached across requests: it gates access, and a gate that
 * can serve a stale value is not a gate. One RPC per public request is the
 * price of the brand colour being correct on the very next request after an
 * administrator saves it.
 *
 * `cache()` below is request-level memoisation only (F-15) — it stops the
 * layout and the page issuing the same query twice within one render, and
 * says nothing about persistence.
 */
export const fetchSiteConfig = cache(runFetchSiteConfig)

/**
 * The cached variant, for pages that display configuration without deciding
 * whether the visitor may see the catalogue. Two different tools, not two
 * conflicting policies.
 */
export const getCachedStoreSettings = unstable_cache(
  async (): Promise<SettingsRow> => {
    const db = await getPublicDb('site')
    const { data } = await db.from('store_settings').select('*').eq('id', true).maybeSingle()
    return (data as SettingsRow | null) ?? ({ ...STORE_DEFAULTS } as SettingsRow)
  },
  ['store-settings'],
  { tags: [TAGS.settings], revalidate: 300 },
)

/** The single key that identifies the store record. */
export const SINGLETON_ID = true

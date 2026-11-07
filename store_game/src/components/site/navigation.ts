import { getMessages } from '@/lib/i18n'
import { SITE_DEFAULTS } from '@/lib/i18n/th/defaults'
import { resolveRouteKey, ROUTES, type RouteKey } from '@/lib/validation/route-keys'
import { safeExternal } from '@/lib/validation/url'
import { safeStoreWhatsAppUrl, type WhatsAppStore } from '@/lib/catalog/whatsapp'
import { brandMediaUrl } from '@/lib/storage/media-url'
import { isSectionEnabled } from '@/lib/catalog/site-content'
import type { Database } from '@/lib/database.types'

type SettingsRow = Database['public']['Tables']['store_settings']['Row']
type SectionRow = Database['public']['Tables']['site_sections']['Row']

export interface NavItem {
  readonly label: string
  readonly href: string
}

/**
 * Navigation is driven by route keys, never by a free-text href (F-13). An
 * item whose key is not in the registry is dropped rather than rendered with
 * an empty href, which would produce a link back to the current page.
 */
export function buildNavItems(sections: readonly SectionRow[]): NavItem[] {
  const payload = sections.find((s) => s.section_key === 'navigation')?.payload
  const rawItems =
    typeof payload === 'object' && payload !== null && Array.isArray((payload as { items?: unknown }).items)
      ? ((payload as { items: unknown[] }).items)
      : SITE_DEFAULTS.navigation.items

  const out: NavItem[] = []
  for (const raw of rawItems) {
    if (typeof raw !== 'object' || raw === null) continue
    const entry = raw as { label?: unknown; route?: unknown }
    if (typeof entry.label !== 'string' || entry.label.length === 0) continue
    if (typeof entry.route !== 'string') continue

    const href = resolveRouteKey(entry.route as RouteKey)
    if (!href) continue

    out.push({ label: entry.label, href })
  }

  return out
}

export function navPayload(sections: readonly SectionRow[]): {
  showSearch: boolean
  showWhatsapp: boolean
} {
  const payload = sections.find((s) => s.section_key === 'navigation')?.payload
  if (typeof payload !== 'object' || payload === null) {
    return { showSearch: true, showWhatsapp: true }
  }
  const record = payload as { show_search?: unknown; show_whatsapp_button?: unknown }
  return {
    showSearch: record.show_search !== false,
    showWhatsapp: record.show_whatsapp_button !== false,
  }
}

export interface FooterLink {
  readonly label: string
  readonly href: string
}

export function buildFooterLinks(
  settings: SettingsRow,
  sections: readonly SectionRow[],
): { internal: FooterLink[]; social: { label: string; href: string }[] } {
  const m = getMessages()
  const payload = sections.find((s) => s.section_key === 'footer')?.payload
  const flags = (typeof payload === 'object' && payload !== null ? payload : {}) as Record<
    string,
    unknown
  >

  const internal: FooterLink[] = []
  if (flags.show_about !== false && settings.store_description) {
    internal.push({ label: m.footer.about, href: ROUTES.contact })
  }
  if (flags.show_games !== false) {
    internal.push({ label: m.footer.games, href: ROUTES.games })
  }
  if (flags.show_contact !== false) {
    internal.push({ label: m.footer.contact, href: ROUTES.contact })
  }

  // Every social link goes through the allowlist. A value that fails becomes
  // no link at all rather than an anchor to an arbitrary host.
  const social: { label: string; href: string }[] = []
  const candidates: [string, string | null][] = [
    ['Facebook', settings.facebook_url],
    ['TikTok', settings.tiktok_url],
    ['Instagram', settings.instagram_url],
  ]
  for (const [label, raw] of candidates) {
    if (!raw) continue
    const href = safeExternal(raw)
    if (href) social.push({ label, href })
  }

  return { internal, social }
}

export function storeLogoUrl(settings: SettingsRow): string | null {
  return brandMediaUrl(settings.logo_path)
}

export function floatingWhatsApp(
  settings: SettingsRow,
): { enabled: boolean; href: string | null; label: string } {
  const m = getMessages()
  if (!settings.floating_whatsapp_enabled) {
    return { enabled: false, href: null, label: '' }
  }
  return {
    enabled: true,
    href: safeStoreWhatsAppUrl(settings as WhatsAppStore),
    label: settings.floating_whatsapp_text || m.whatsapp.floating,
  }
}

export { isSectionEnabled }

import { safeExternal } from '@/lib/validation/url'

/**
 * WhatsApp is the store's only customer channel, and the site never sends a
 * message on the visitor's behalf: it copies the product code, opens WhatsApp,
 * and the customer pastes the code themselves.
 *
 * Only the digits are stored (C-11). The link is derived here so the database
 * can never hold a URL that disagrees with the phone number, and so the
 * allowlist has exactly one place to enforce.
 */
export interface WhatsAppStore {
  readonly whatsapp_number: string | null
}

/** digits-only, 8-15 characters, per the store_settings CHECK constraint. */
const DIGITS = /^[0-9]{8,15}$/

export function isUsableWhatsAppNumber(raw: string | null | undefined): raw is string {
  return typeof raw === 'string' && DIGITS.test(raw)
}

export function whatsappBaseUrl(store: WhatsAppStore): string | null {
  if (!isUsableWhatsAppNumber(store.whatsapp_number)) return null
  return `https://wa.me/${store.whatsapp_number}`
}

/** Deep link that pre-fills the greeting text with product code (and name when provided). */
export function waProductUrl(
  store: WhatsAppStore,
  productCode: string,
  productName?: string,
): string | null {
  const base = whatsappBaseUrl(store)
  if (!base) return null
  const code = productCode.trim()
  if (code.length === 0) return null
  const cleanName = productName?.trim()
  const text = cleanName
    ? `สนใจไอดีเกม ${cleanName} (รหัส ${code}) ครับ/ค่ะ`
    : `สนใจไอดีเกมรหัส ${code} ครับ/ค่ะ`
  return `${base}?text=${encodeURIComponent(text)}`
}

/**
 * The final gate before a link reaches an href. Returning null here means the
 * caller renders a disabled button with a tooltip instead of an empty href —
 * a link the administrator typed that failed validation must never become a
 * live anchor.
 */
export function safeWhatsAppUrl(
  store: WhatsAppStore,
  productCode: string,
  productName?: string,
): string | null {
  const url = waProductUrl(store, productCode, productName)
  if (!url) return null
  return safeExternal(url)
}

export function safeStoreWhatsAppUrl(store: WhatsAppStore): string | null {
  const base = whatsappBaseUrl(store)
  if (!base) return null
  return safeExternal(base)
}

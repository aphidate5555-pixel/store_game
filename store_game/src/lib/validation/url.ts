/**
 * The single URL allowlist for the whole project (C-13).
 *
 * The host set below is mirrored in `supabase/migrations/01_extensions_and_helpers.sql`
 * as the source of truth for the database CHECK constraints, and
 * tests/unit/sql-allowlist-parity.test.ts reads that SQL file and asserts the
 * two sets are identical so they cannot drift apart.
 */
export const EXTERNAL_HOSTS = [
  'wa.me',
  'api.whatsapp.com',
  'm.me',
  'facebook.com',
  'www.facebook.com',
  'tiktok.com',
  'www.tiktok.com',
  'instagram.com',
  'www.instagram.com',
] as const

const EXTERNAL_HOST_SET = new Set<string>(EXTERNAL_HOSTS)
const WA_HOSTS = new Set<string>(['wa.me', 'api.whatsapp.com'])

/** Characters permitted inside a same-site path. Anything outside this set —
 *  including tab, CR, LF, space, `<`, `>` and backslash — is rejected by
 *  construction, which is what closes the C-6 bypass. */
const PATH_CHARS = new Set(
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~/?#[]@!$&()*+,;=%',
)

const BACKSLASH = String.fromCharCode(92)
const MAX_INTERNAL_LENGTH = 200
const WA_NUMBER = /^\/[0-9]{8,15}$/

/**
 * Validates a path that stays on this site.
 * Returns the cleaned value, or null when it must not be rendered as a link.
 */
export function safeInternal(raw: string): string | null {
  const value = raw.trim()
  if (value.length === 0) return null
  if (!value.startsWith('/')) return null
  // '//evil.com' and '/\evil.com' are protocol-relative URLs, not local paths.
  if (value.startsWith('//')) return null
  if (value.includes(BACKSLASH)) return null
  if (value.length > MAX_INTERNAL_LENGTH) return null
  for (const char of value) {
    if (!PATH_CHARS.has(char)) return null
  }
  return value
}

/**
 * The `next` parameter of the admin login round trip is additionally scoped to
 * /admin, so a crafted link cannot bounce an authenticated user to another
 * part of the site (C-6).
 */
export function safeAdminNext(raw: string | null | undefined): string | null {
  if (!raw) return null
  const safe = safeInternal(raw)
  if (!safe) return null
  return /^(\/admin)(?:\/|$)/.test(safe) ? safe : null
}

/**
 * Validates an admin-authored external link.
 * Parsing (not prefix matching) is mandatory: `https://www.facebook.com.evil.com/`
 * and `https://www.facebook.com@evil.com/` both start with an allowed prefix
 * while belonging to an attacker.
 */
export function safeExternal(raw: string): string | null {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.protocol !== 'https:') return null
  if (url.username !== '' || url.password !== '') return null

  if (WA_HOSTS.has(url.hostname)) {
    if (url.hostname === 'wa.me') {
      return WA_NUMBER.test(url.pathname) ? url.toString() : null
    }
    const phone = url.searchParams.get('phone') ?? ''
    return url.pathname === '/send' && /^[0-9]{8,15}$/.test(phone) ? url.toString() : null
  }

  return EXTERNAL_HOST_SET.has(url.hostname) ? url.toString() : null
}

export function safeHref(raw: string, kind: 'internal' | 'external'): string | null {
  return kind === 'internal' ? safeInternal(raw) : safeExternal(raw)
}

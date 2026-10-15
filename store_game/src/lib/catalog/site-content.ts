import type { Database } from '@/lib/database.types'
import type { Messages } from '@/lib/i18n/types'

type SectionRow = Database['public']['Tables']['site_sections']['Row']

/**
 * Merges administrator-authored section payloads over the dictionary.
 *
 * Two rules make this safe:
 *
 * 1. The database always wins. The dictionary is the fallback, not the
 *    source. A payload that only contains `{ enabled: false }` must leave
 *    every other string at its default, which is why the merge is per key and
 *    not a wholesale replace.
 *
 * 2. Unknown keys are dropped. Without this an administrator could inject
 *    arbitrary structure into the message object; every other section would
 *    then try to render a value of the wrong shape.
 */
type AnyRecord = Record<string, unknown>

function isPlainObject(value: unknown): value is AnyRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function merge(base: unknown, patch: unknown): unknown {
  if (!isPlainObject(patch)) return base
  if (!isPlainObject(base)) return base

  const out: AnyRecord = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    if (!(key in out)) continue
    const current = out[key]
    if (typeof current === 'function') continue
    if (isPlainObject(current) && isPlainObject(value)) {
      out[key] = merge(current, value)
    } else {
      out[key] = value
    }
  }
  return out
}

/** Maps a section key to the group it feeds in the message tree. */
function groupFor(sectionKey: string): string | null {
  const group = sectionKey.replace('_products', '').replace('all_', '')
  return group.length > 0 ? group : null
}

export function resolveStrings(messages: Messages, sections: readonly SectionRow[]): Messages {
  const out: AnyRecord = { ...(messages as unknown as AnyRecord) }

  for (const section of sections) {
    const group = groupFor(section.section_key)
    if (!group || !(group in out)) continue
    // Reads `payload`, not `content` (C-2).
    out[group] = merge(out[group], section.payload)
  }

  return out as unknown as Messages
}

export function sectionPayload(
  sections: readonly SectionRow[],
  key: string,
): AnyRecord {
  const found = sections.find((section) => section.section_key === key)
  return isPlainObject(found?.payload) ? found.payload : {}
}

export function isSectionEnabled(sections: readonly SectionRow[], key: string): boolean {
  return sectionPayload(sections, key).enabled !== false
}

import { cache } from 'react'

import { site, whatsapp, states, errors, maintenance, footer, seo } from './th'
import type { Messages } from './types'

/**
 * The only locale. The structure supports more: `locales` is a const tuple and
 * `dictionaries` is keyed by it, so adding a language means adding a file and
 * one line here. There is no [locale] path segment — a language switcher was
 * never in scope, and a segment would force a decision about every canonical
 * URL.
 */
export const locales = ['th'] as const
export type Locale = (typeof locales)[number]

/**
 * The standalone groups are nested, not spread.
 *
 * `...whatsapp` would put cta/floating/copied at the TOP level of the message
 * map, so `m.whatsapp.copied` would not exist — and the type, derived from the
 * same shape, would agree with the bug rather than catching it.
 */
const dictionaries: Record<Locale, Messages> = {
  th: {
    ...site,
    whatsapp,
    states,
    error: errors,
    maintenance,
    footer,
    seo,
  } as unknown as Messages,
}

export const isLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value)

/**
 * F-15: React's `cache()` memoises within a single request only. It is NOT a
 * persistent cache and NOT what keeps a value fresh across visitors — that is
 * `unstable_cache` plus the tag invalidation in src/lib/cache/tags.ts. The
 * comment is here because "we call cache() so it is cached" is a reading this
 * file invites, and it is wrong.
 */
export const getDictionary = cache(async (locale: Locale = 'th'): Promise<Messages> => {
  const dictionary = dictionaries[locale]
  if (!dictionary) throw new Error(`ไม่พบแผนภาษา: ${locale}`)
  return dictionary
})

/** Synchronous access for Server Components that are already async. */
export const getMessages = (locale: Locale = 'th'): Messages => dictionaries[locale]

export type { Messages }
export type { MessageKey } from './types'

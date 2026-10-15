import { z } from 'zod'

/**
 * Internal navigation is driven by a route key, never by a free-text href
 * typed by an administrator (F-13). The key is the only thing stored in
 * site_sections.payload.navigation.items[].route and in the hero CTA, and
 * resolving it against this registry is the only way to obtain a URL.
 *
 * The registry is the single source of truth for every internal link in the
 * project: public header, footer, hero CTA, admin navigation and the login
 * `next` parameter. Adding a page means adding a key here first.
 */
export const ROUTES = {
  home: '/',
  products: '/products',
  games: '/games',
  contact: '/contact',
} as const

export type RouteKey = keyof typeof ROUTES

export const ROUTE_KEYS = ['home', 'products', 'games', 'contact'] as const satisfies readonly RouteKey[]

/** Keys an administrator may attach to a menu item. `/admin/*` is excluded by
 *  construction: the admin area must never appear in public navigation. */
export const PUBLIC_ROUTE_KEYS: readonly RouteKey[] = ROUTE_KEYS

export const routeKeySchema = z.enum(ROUTE_KEYS)

/** Resolves a stored key to its path. Unknown keys are impossible by the type
 *  system, but a payload that predates a key removal is still handled. */
export function resolveRouteKey(key: RouteKey | string | null | undefined): string | null {
  if (typeof key !== 'string') return null
  return ROUTES[key as RouteKey] ?? null
}

import type { th as siteTh } from './th/site'
import type { th as whatsappTh } from './th/whatsapp'
import type { th as statesTh } from './th/states'
import type { th as errorsTh } from './th/errors'
import type { th as maintenanceTh } from './th/maintenance'
import type { th as footerTh } from './th/footer'
import type { th as seoTh } from './th/seo'
import type { adminTh } from './th/admin'

/**
 * Storefront: literals widen to string, and nested objects are recursed
 * rather than collapsed (C-20). A non-recursive Widen<T> turns `m.nav` into
 * the string "object", so `m.nav.home` stops compiling — which is the bug this
 * shape exists to prevent.
 *
 * Function values keep their signatures, because several of them take
 * arguments (`footer.rights(year, store)`).
 */
type Widen<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => R
    : T[K] extends object
      ? Widen<T[K]>
      : string
}

export type SiteMessages = Widen<typeof siteTh>
export type WhatsappMessages = Widen<typeof whatsappTh>
export type StateMessages = Widen<typeof statesTh>
export type ErrorMessages = Widen<typeof errorsTh>
export type MaintenanceMessages = Widen<typeof maintenanceTh>
export type FooterMessages = Widen<typeof footerTh>
export type SeoMessages = Widen<typeof seoTh>

/** The admin message map keeps literal values so MessageKey stays exact. */
export type AdminMessages = typeof adminTh
export type MessageKey = keyof AdminMessages

/**
 * The message map, mirroring the object built in src/lib/i18n/index.ts.
 *
 * The standalone groups are nested under their own key, not intersected at
 * the top level. That is not a style choice: `...whatsapp` at the top level
 * would put cta/floating/copied beside nav and hero, so `m.whatsapp.copied`
 * would not exist — and a type that flattened the same way would agree with
 * the bug instead of catching it.
 */
type RawMessages = typeof siteTh & {
  readonly whatsapp: typeof whatsappTh
  readonly states: typeof statesTh
  readonly error: typeof errorsTh
  readonly maintenance: typeof maintenanceTh
  readonly footer: typeof footerTh
  readonly seo: typeof seoTh
}

export type Messages = Widen<RawMessages>

import { adminTh as common } from './common'
import { adminTh as login } from './login'
import { adminTh as dashboard } from './dashboard'
import { adminTh as products } from './products'
import { adminTh as categories } from './categories'
import { adminTh as settings } from './settings'
import { adminTh as appearance } from './appearance'
import { adminTh as validation } from './validation'

/**
 * One flat map, so MessageKey = keyof typeof adminTh covers every screen.
 * A key that is referenced but missing is a compile error rather than a
 * runtime "undefined" rendered on an administrator's screen.
 *
 * The files are `as const` individually, so the spread preserves the literal
 * types and the union of keys is exact.
 */
export const adminTh = {
  ...common,
  ...login,
  ...dashboard,
  ...products,
  ...categories,
  ...settings,
  ...appearance,
  ...validation,
} as const

export type AdminMessages = typeof adminTh
export type MessageKey = keyof AdminMessages

type Vars = Record<string, string | number>

/**
 * Replaces {placeholder} tokens. The caller must pass a key that exists —
 * the parameter type is the union of real keys, so a typo is a build error.
 */
export function t(key: MessageKey, vars: Vars = {}): string {
  const template: string = adminTh[key]
  return Object.entries(vars).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template,
  )
}

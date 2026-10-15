/**
 * The only place a price is turned into a string (C-12).
 *
 * `Intl` with `style: 'currency'` is deliberately NOT used: CLDR renders THB
 * and LAK with two fraction digits, which contradicts the agreed display and
 * would print "฿1,250.00" on the storefront.
 */
export type Currency = 'THB' | 'LAK'

interface Unit {
  readonly prefix: string
  readonly suffix: string
}

const UNIT: Record<Currency, Unit> = {
  THB: { prefix: '฿', suffix: '' },
  LAK: { prefix: '', suffix: ' ลาว (LAK)' },
}

/**
 * Groups the digits without going through Number.
 *
 * price_amount is a bigint in the database, and a single conversion to Number
 * silently rounds anything above 2^53 — a price of 9007199254740993 would be
 * displayed as …992. Grouping the decimal string directly keeps every digit.
 */
function groupDigits(price: bigint | number): string {
  const raw = typeof price === 'bigint' ? price.toString() : String(Math.trunc(price))
  const negative = raw.startsWith('-')
  const digits = negative ? raw.slice(1) : raw
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return negative ? `-${grouped}` : grouped
}

export function formatPrice(price: bigint | number, currency: Currency): string {
  const unit = UNIT[currency] ?? UNIT.THB
  return `${unit.prefix}${groupDigits(price)}${unit.suffix}`
}

/** The unformatted numeric value, for places that must not carry a separator:
 *  JSON-LD offers, meta tags, and any machine-read field. */
export function priceValue(price: bigint | number): string {
  return (typeof price === 'bigint' ? price : BigInt(Math.trunc(price))).toString()
}

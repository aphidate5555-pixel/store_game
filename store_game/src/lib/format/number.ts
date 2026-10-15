/**
 * Locale and time zone are pinned so output cannot drift with the machine
 * that happens to render it. Without the `-u-nu-latn-ca-gregory` extension a
 * Thai default locale renders Arabic-Indic digits and the Buddhist calendar,
 * which would put "๒๕๖๘" in the price column.
 */
const LOCALE = 'th-TH-u-nu-latn-ca-gregory'
const TIME_ZONE = 'Asia/Bangkok'

const countFormatter = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 })
const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: TIME_ZONE,
})

export const formatCount = (value: number): string => countFormatter.format(value)

export const formatDateTime = (iso: string | Date): string =>
  dateTimeFormatter.format(typeof iso === 'string' ? new Date(iso) : iso)

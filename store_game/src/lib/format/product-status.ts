import { formatDateTime } from './number'
import type { Database } from '@/lib/database.types'

export type ProductStatus = Database['public']['Enums']['product_status']

/**
 * A status is never communicated by colour alone. Every consumer must render
 * the label, an icon and a distinct shape, because roughly one in twelve men
 * has a colour vision deficiency and a dark theme makes the red/green pair
 * worse, not better.
 */
export interface StatusPresentation {
  readonly label: string
  readonly tone: 'success' | 'warning' | 'danger'
  readonly icon: 'check' | 'clock' | 'ban'
  /** Tailwind class controlling the silhouette. */
  readonly shape: string
  readonly ariaLabel: string
}

const STATUS: Record<ProductStatus, StatusPresentation> = {
  available: {
    label: 'พร้อมขาย',
    tone: 'success',
    icon: 'check',
    shape: 'rounded-full',
    ariaLabel: 'สถานะ: พร้อมขาย',
  },
  reserved: {
    label: 'ติดจอง',
    tone: 'warning',
    icon: 'clock',
    shape: 'rounded-md',
    ariaLabel: 'สถานะ: ติดจอง',
  },
  sold: {
    label: 'ขายแล้ว',
    tone: 'danger',
    icon: 'ban',
    shape: 'rounded-sm [clip-path:polygon(0_0,calc(100%_-_6px)_0,100%_6px,100%_100%,0_100%)]',
    ariaLabel: 'สถานะ: ขายแล้ว',
  },
}

export const productStatus = (status: ProductStatus): StatusPresentation => STATUS[status] ?? STATUS.available

export const isAvailable = (status: ProductStatus): boolean => status === 'available'

export { formatDateTime }

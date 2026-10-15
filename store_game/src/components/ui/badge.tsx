import { Ban, CheckCircle2 } from 'lucide-react'

import { productStatus } from '@/lib/format/product-status'
import type { ProductStatus } from '@/lib/format/product-status'

/**
 * Status badge.
 *
 * A status is never carried by colour alone. Each state has three channels:
 * a different word, a different icon and a different silhouette. A rounded
 * pill for "available" and a notched rectangle for "sold" survive both a
 * greyscale print and the ~8% of men with a red/green colour deficiency, and
 * the dark theme makes that pair worse rather than better.
 */
const TONE_CLASS = {
  success: 'bg-success/12 text-success border-success/30',
  danger: 'bg-danger/12 text-danger border-danger/30',
} as const

export function StatusBadge({
  status,
  size = 'md',
}: {
  status: ProductStatus
  size?: 'sm' | 'md'
}) {
  const presentation = productStatus(status)
  const Icon = presentation.icon === 'check' ? CheckCircle2 : Ban

  return (
    <span
      // The visible text already says the status, so the accessible name is
      // not duplicated with aria-label on top of it.
      className={[
        'inline-flex items-center gap-1 border font-medium whitespace-nowrap',
        TONE_CLASS[presentation.tone],
        presentation.shape,
        size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-xs',
      ].join(' ')}
    >
      <Icon size={12} aria-hidden="true" />
      {presentation.label}
    </span>
  )
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode
  tone?: 'neutral' | 'primary' | 'success' | 'danger' | 'accent'
  className?: string
}) {
  const tones = {
    neutral: 'bg-surface-2 text-text-2 border-line',
    primary: 'bg-primary/12 text-primary border-primary/30',
    success: 'bg-success/12 text-success border-success/30',
    danger: 'bg-danger/12 text-danger border-danger/30',
    accent: 'bg-accent/12 text-accent border-accent/30',
  } as const

  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  )
}

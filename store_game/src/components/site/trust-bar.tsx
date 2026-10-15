import { ShieldCheck, Zap, MessageCircle, BadgeCheck } from 'lucide-react'

import { getMessages } from '@/lib/i18n'
import { sectionPayload } from '@/lib/catalog/site-content'
import type { Database } from '@/lib/database.types'

type SectionRow = Database['public']['Tables']['site_sections']['Row']

const ICONS = [BadgeCheck, Zap, MessageCircle, ShieldCheck] as const

/**
 * The trust bar. Four items is the maximum: a fifth row of claims on a phone
 * pushes the actual product grid below the fold.
 */
export function TrustBar({ sections }: { sections: readonly SectionRow[] }) {
  const m = getMessages()
  const payload = sectionPayload(sections, 'trust')

  const rawItems = Array.isArray(payload.items) ? payload.items : []
  const count = typeof payload.count === 'number' ? payload.count : 4

  const items: string[] = []
  for (const raw of rawItems) {
    if (typeof raw === 'string' && raw.trim().length > 0) items.push(raw.trim())
  }

  // Fall back to the built-in list so an empty payload still renders a bar
  // rather than a blank strip.
  const resolved =
    items.length > 0
      ? items
      : [m.trust.items.scan, m.trust.items.fast, m.trust.items.support, m.trust.items.guarantee]

  const shown = resolved.slice(0, Math.min(Math.max(count, 0), 4))
  if (shown.length === 0) return null

  return (
    <section aria-label={m.trust.heading} className="border-b border-line bg-surface">
      <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-4 py-4 md:grid-cols-4">
        {shown.map((label, index) => {
          const Icon = ICONS[index % ICONS.length] ?? BadgeCheck
          return (
            <li key={label} className="flex items-center gap-2">
              {/* Decorative: the label beside it already carries the meaning. */}
              <Icon size={16} className="shrink-0 text-primary" aria-hidden="true" />
              <span className="text-xs text-text-2 md:text-sm">{label}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

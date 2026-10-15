'use client'

import { MessageCircle } from 'lucide-react'

import { getMessages } from '@/lib/i18n'

/**
 * The floating WhatsApp button.
 *
 * When the store has no phone number yet, `href` is null and this renders a
 * disabled button with an explanation. An anchor with an empty href would
 * reload the current page and read as a broken site rather than as
 * "not configured yet".
 */
export function FloatingWhatsApp({
  href,
  label,
}: {
  href: string | null
  label: string
}) {
  const m = getMessages()

  const className =
    'fixed bottom-4 right-4 z-40 inline-flex min-h-12 items-center gap-2 rounded-full px-5 text-sm font-medium shadow-lg transition-[background-color,transform] duration-micro focus-ring ' +
    'pb-[max(0.75rem,env(safe-area-inset-bottom))]'

  if (!href) {
    return (
      <button
        type="button"
        disabled
        aria-describedby="floating-wa-hint"
        title={m.whatsapp.unavailableHint}
        className={`${className} cursor-not-allowed border border-line bg-surface-2 text-text-3`}
      >
        <MessageCircle size={18} aria-hidden="true" />
        {label || m.whatsapp.floating}
        <span id="floating-wa-hint" className="sr-only">
          {m.whatsapp.missingBody}
        </span>
      </button>
    )
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={m.whatsapp.floatingAria}
      className={`${className} bg-primary text-on-primary hover:brightness-95 active:translate-y-px`}
    >
      <MessageCircle size={18} aria-hidden="true" />
      {label || m.whatsapp.floating}
    </a>
  )
}

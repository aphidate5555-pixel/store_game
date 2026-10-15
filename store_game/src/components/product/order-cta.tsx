'use client'

import { useState } from 'react'
import { Copy, ExternalLink } from 'lucide-react'

import { useToast } from '@/components/ui/toast'
import { safeWhatsAppUrl, type WhatsAppStore } from '@/lib/catalog/whatsapp'
import { getMessages } from '@/lib/i18n'

/**
 * The order button.
 *
 * Two things here are not obvious:
 *
 * 1. The tab is opened BEFORE the await. `await clipboard.writeText()` yields
 *    to the microtask queue, and by the time `window.open` runs the transient
 *    user activation has expired, so Safari blocks the popup. Opening
 *    about:blank synchronously and navigating it afterwards keeps the
 *    activation valid for the whole handler.
 *
 * 2. The clipboard has a fallback. navigator.clipboard is undefined on a
 *    non-secure origin, which is exactly the case when an administrator
 *    opens the site over the LAN on a phone to check a change.
 */
export function OrderCta({ store, productCode }: { store: WhatsAppStore; productCode: string }) {
  const m = getMessages()
  const toast = useToast()
  const [manualUrl, setManualUrl] = useState<string | null>(null)
  const [noContact, setNoContact] = useState(false)

  async function copyText(text: string): Promise<void> {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return
    }
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    textarea.remove()
    if (!ok) throw new Error('copy failed')
  }

  async function handleOrder(): Promise<void> {
    // Synchronous, inside the click handler, before any await.
    const tab = window.open('about:blank', '_blank')
    // Nulling opener detaches the new page from ours. `noopener` in a feature
    // string does the same thing but makes window.open return null, which
    // would leave nothing to navigate.
    if (tab) tab.opener = null

    try {
      await copyText(productCode)
      toast.success(m.whatsapp.copied, m.whatsapp.copiedDetail)
    } catch {
      toast.error(m.whatsapp.copyFailed, m.whatsapp.copyFailedBody)
    }

    // The allowlist is applied here as well as at save time: a number that was
    // stored before the allowlist existed must not become a live link.
    const url = safeWhatsAppUrl(store, productCode)

    if (!url) {
      tab?.close()
      setNoContact(true)
      return
    }

    if (tab) {
      tab.location.replace(url)
      return
    }

    // Popup blocked. Offer the link rather than silently doing nothing.
    setManualUrl(url)
  }

  if (noContact) {
    return (
      <div className="rounded-lg border border-line bg-surface-2 p-4">
        <p className="text-sm font-medium text-text">{m.whatsapp.missingTitle}</p>
        <p className="mt-1 text-sm text-text-2">{m.whatsapp.missingBody}</p>
      </div>
    )
  }

  if (manualUrl) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-warning">{m.whatsapp.popupBlocked}</p>
        <a
          href={manualUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 text-base font-medium text-on-primary focus-ring"
        >
          {m.whatsapp.openHere}
          <ExternalLink size={16} aria-hidden="true" />
        </a>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => void handleOrder()}
      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 text-base font-medium text-on-primary transition-[background-color,transform] duration-micro ease-out-soft hover:brightness-95 active:translate-y-px focus-ring"
    >
      <Copy size={18} aria-hidden="true" />
      {m.whatsapp.cta}
    </button>
  )
}

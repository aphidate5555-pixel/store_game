'use client'

import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

/**
 * Centred modal, for the re-authentication prompt and destructive
 * confirmations. Same focus contract as the bottom sheet: trapped while open,
 * Escape closes, focus returns to whatever opened it.
 */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  closeOnBackdrop = true,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
  closeOnBackdrop?: boolean
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      const panel = panelRef.current
      if (!panel) return

      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null,
      )
      if (items.length === 0) return

      const first = items[0]
      const last = items[items.length - 1]
      if (!first || !last) return

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    },
    [onClose],
  )

  useEffect(() => {
    if (!open) return

    restoreFocusRef.current = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const timer = setTimeout(() => {
      const panel = panelRef.current
      const focusable = panel?.querySelector<HTMLElement>('[data-autofocus]')
      const fallback = panel?.querySelector<HTMLElement>(FOCUSABLE)
      ;(focusable ?? fallback)?.focus()
    }, 0)

    return () => {
      clearTimeout(timer)
      document.body.style.overflow = previousOverflow
      restoreFocusRef.current?.focus()
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 grid max-h-[90svh] place-items-center p-4" onKeyDown={handleKeyDown}>
      <div
        aria-hidden="true"
        onClick={closeOnBackdrop ? onClose : undefined}
        className="absolute inset-0 bg-ink/70 backdrop-blur-sm"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={description ? 'modal-description' : undefined}
        className="relative w-full max-w-md max-h-[90svh] overflow-y-auto overscroll-contain rounded-xl border border-line bg-surface p-5"
      >
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="modal-title" className="text-base font-semibold text-text">
              {title}
            </h2>
            {description ? (
              <p id="modal-description" className="mt-1 text-sm text-text-2">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="shrink-0 size-11 -mt-1 -mr-1 grid place-items-center rounded-lg text-text-2 hover:text-text hover:bg-surface-2 focus-ring"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        {children ? <div className="mb-4">{children}</div> : null}
        {footer}
      </div>
    </div>
  )
}

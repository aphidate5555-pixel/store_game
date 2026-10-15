'use client'

import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

/**
 * Bottom sheet.
 *
 * Uses svh, not vh: on iOS, vh is the height of the viewport with the URL bar
 * expanded, so a sheet sized in vh extends below the fold and the confirm
 * button at the bottom of a filter form is unreachable.
 *
 * overscroll-contain stops the scroll from chaining to the page behind, which
 * on a filter sheet means scrolling to the end and having the product grid
 * move instead of the list.
 *
 * Focus is trapped while open and returned to the trigger on close, so a
 * keyboard user is not dropped at the top of the document.
 */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function BottomSheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  labelledBy,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  labelledBy?: string
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

    // Move focus into the panel so the next Tab lands inside it.
    const timer = setTimeout(() => {
      const panel = panelRef.current
      const first = panel?.querySelector<HTMLElement>(FOCUSABLE)
      first?.focus()
    }, 0)

    // The page behind must not scroll while the sheet is open.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      clearTimeout(timer)
      document.body.style.overflow = previousOverflow
      restoreFocusRef.current?.focus()
    }
  }, [open])

  if (!open) return null

  const titleId = labelledBy ?? 'bottom-sheet-title'

  return (
    <div className="fixed inset-0 z-50 flex items-end" onKeyDown={handleKeyDown}>
      {/* Backdrop. aria-hidden because Escape and the close button are the
          accessible ways out; a focusable backdrop adds a tab stop that goes
          nowhere. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-ink/70 backdrop-blur-sm"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={[
          'relative w-full max-h-[85svh] flex flex-col',
          'bg-surface border-t border-line rounded-t-2xl',
          'overscroll-contain',
        ].join(' ')}
      >
        <div className="flex justify-center pt-2 pb-1 shrink-0" aria-hidden="true">
          <span className="h-1 w-10 rounded-full bg-line-ctl" />
        </div>

        <header className="flex items-start justify-between gap-4 px-4 pb-3 shrink-0">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-text">
              {title}
            </h2>
            {description ? <p className="mt-0.5 text-sm text-text-2">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="shrink-0 size-11 grid place-items-center rounded-lg text-text-2 hover:text-text hover:bg-surface-2 focus-ring"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4">{children}</div>

        {footer ? (
          <div className="shrink-0 border-t border-line px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        ) : (
          <div className="h-[max(1rem,env(safe-area-inset-bottom))] shrink-0" />
        )}
      </div>
    </div>
  )
}

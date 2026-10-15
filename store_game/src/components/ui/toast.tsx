'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, TriangleAlert, X } from 'lucide-react'

type ToastTone = 'info' | 'success' | 'error'

interface Toast {
  readonly id: number
  readonly tone: ToastTone
  readonly title: string
  readonly body?: string
}

interface ToastApi {
  readonly show: (tone: ToastTone, title: string, body?: string) => void
  readonly success: (title: string, body?: string) => void
  readonly error: (title: string, body?: string) => void
  readonly dismiss: (id: number) => void
}

const ToastContext = createContext<ToastApi | null>(null)

/** At most three at once: beyond that they stack into an unreadable wall. */
const MAX_VISIBLE = 3
const DEFAULT_DURATION = 5000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counterRef = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const show = useCallback((tone: ToastTone, title: string, body?: string) => {
    // A ref, not state: the id has to be unique and the increment must not
    // depend on a render having flushed in between.
    counterRef.current += 1
    const id = counterRef.current
    setToasts((current) => {
      const next: Toast = { id, tone, title, body }
      return [...current, next].slice(-MAX_VISIBLE)
    })
  }, [])

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (title, body) => show('success', title, body),
      error: (title, body) => show('error', title, body),
      dismiss,
    }),
    [show, dismiss],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast ต้องอยู่ภายใน ToastProvider')
  return context
}

function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div
      // Polite for information, assertive for failures: a screen reader should
      // not interrupt to announce "copied to clipboard", but it must announce
      // that a save failed.
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  useEffect(() => {
    // Errors stay until dismissed; the user has to have seen them.
    if (toast.tone === 'error') return
    const timer = setTimeout(() => onDismiss(toast.id), DEFAULT_DURATION)
    return () => clearTimeout(timer)
  }, [toast, onDismiss])

  const isError = toast.tone === 'error'
  const Icon = isError ? TriangleAlert : CheckCircle2

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      className={[
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3',
        'bg-surface-2 shadow-lg',
        isError ? 'border-danger/40' : 'border-line',
      ].join(' ')}
    >
      <Icon
        size={18}
        aria-hidden="true"
        className={['mt-0.5 shrink-0', isError ? 'text-danger' : 'text-success'].join(' ')}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text">{toast.title}</p>
        {toast.body ? <p className="mt-0.5 text-sm text-text-2">{toast.body}</p> : null}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="ปิดการแจ้งเตือน"
        className="shrink-0 rounded p-1 text-text-3 hover:text-text focus-ring"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  )
}

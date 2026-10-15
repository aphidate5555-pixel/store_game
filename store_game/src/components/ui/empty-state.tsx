import { SearchX, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * These are Server Components on purpose. A thrown error's message would carry
 * a stack trace and the request URL, neither of which should reach a
 * visitor's screen.
 */
export function EmptyState({
  title,
  body,
  action,
  icon = 'search',
}: {
  title: string
  body?: string
  action?: ReactNode
  icon?: 'search' | 'generic'
}) {
  const Icon = icon === 'search' ? SearchX : SearchX

  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-14 text-center">
      <Icon size={32} className="text-text-3" aria-hidden="true" />
      <div>
        <p className="text-base font-medium text-text">{title}</p>
        {body ? <p className="mt-1 text-sm text-text-2">{body}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function ErrorState({
  title = 'เกิดข้อผิดพลาด',
  body = 'กรุณาลองใหม่อีกครั้ง',
  action,
}: {
  title?: string
  body?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-14 text-center">
      <TriangleAlert size={32} className="text-danger" aria-hidden="true" />
      <div>
        <p className="text-base font-medium text-text">{title}</p>
        <p className="mt-1 text-sm text-text-2">{body}</p>
      </div>
      {action}
    </div>
  )
}

export function NotFound({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return <EmptyState title={title} body={body} action={action} />
}

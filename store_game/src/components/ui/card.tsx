import type { HTMLAttributes, ReactNode } from 'react'

/**
 * The card surface. `overflow-hidden` is what makes the rounded corners clip the
 * image, and it is also why the focus ring uses `outline` rather than a
 * Tailwind ring: a box-shadow ring would be clipped away at the edge.
 */
export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      className={[
        'bg-surface border border-line rounded-xl overflow-hidden',
        'transition-[background-color,border-color] duration-micro ease-out-soft',
        'hover:border-line-ctl focus-within:border-primary/40',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...rest }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={['px-4 pt-4 pb-2', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </div>
  )
}

export function CardBody({ className, children, ...rest }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={['px-4 pb-4', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </div>
  )
}

/** A titled block on a settings or admin page. */
export function Section({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={['bg-surface border border-line rounded-xl p-4 md:p-5', className].filter(Boolean).join(' ')}
    >
      <header className="mb-4">
        <h2 className="text-base font-semibold text-text">{title}</h2>
        {description ? <p className="mt-1 text-sm text-text-2">{description}</p> : null}
      </header>
      {children}
    </section>
  )
}

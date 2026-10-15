import type { ButtonHTMLAttributes, ReactNode } from 'react'

/**
 * Button styles as a class factory rather than a component, because the same
 * button shape is applied to <button>, <a> and a router Link in different
 * places and a component cannot cover all three without losing the element
 * semantics that the accessibility rules depend on.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'danger' | 'link'
export type ButtonSize = 'sm' | 'md' | 'lg'

const BASE =
  'inline-flex items-center justify-center gap-2 font-medium rounded-lg ' +
  'transition-[background-color,border-color,color,transform] duration-micro ease-out-soft ' +
  'focus-ring disabled:pointer-events-none disabled:opacity-50 select-none'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:brightness-95 active:translate-y-px',
  secondary: 'bg-surface-2 text-text border border-line hover:border-line-ctl hover:bg-surface-3',
  ghost: 'bg-transparent text-text-2 hover:text-text hover:bg-surface-2',
  accent: 'bg-accent text-ink hover:brightness-95 active:translate-y-px',
  danger: 'bg-danger text-white hover:brightness-110 active:translate-y-px',
  link: 'bg-transparent text-primary underline underline-offset-4 hover:text-primary-hover p-0 h-auto',
}

const SIZES: Record<ButtonSize, string> = {
  // Every size clears 44px except the link variant, which is inline text.
  sm: 'min-h-11 px-3 text-sm',
  md: 'min-h-11 px-4 text-sm',
  lg: 'min-h-12 px-6 text-base',
}

export function buttonClass(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  extra?: string,
): string {
  const sizeClass = variant === 'link' ? '' : (SIZES[size] ?? SIZES.md)
  return [BASE, VARIANTS[variant], sizeClass, extra].filter(Boolean).join(' ')
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant
  readonly size?: ButtonSize
  readonly children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </button>
  )
}

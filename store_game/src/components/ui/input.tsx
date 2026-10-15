import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

/**
 * Form field.
 *
 * Every control is text-base (16px). Below 16px iOS Safari zooms the viewport
 * on focus, and the page stays zoomed after the field is dismissed — a
 * failure that is invisible on a desktop and constant on a phone.
 *
 * `min-h-11` is 44px, the minimum comfortable tap target.
 *
 * The hint is wired with aria-describedby rather than left as a placeholder:
 * a placeholder disappears the moment the user types, which is exactly when
 * they need to check the format.
 */
const CONTROL =
  'w-full min-h-11 rounded-lg border border-line bg-surface-2 px-3 text-base text-text ' +
  'placeholder:text-text-3 transition-[background-color,border-color] duration-micro ease-out-soft ' +
  'hover:border-line-ctl focus-ring disabled:opacity-50 disabled:cursor-not-allowed'

const LABEL = 'block text-sm font-medium text-text-2 mb-1.5'

interface FieldShellProps {
  readonly id: string
  readonly label: string
  readonly hint?: string
  readonly error?: string
  readonly required?: boolean
  readonly requiredLabel?: string
  readonly children: ReactNode
}

function FieldShell({
  id,
  label,
  hint,
  error,
  required,
  requiredLabel,
  children,
}: FieldShellProps) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div>
      <label htmlFor={id} className={LABEL}>
        {label}
        {required ? (
          <span className="text-danger" aria-hidden="true">
            {' '}
            *
          </span>
        ) : null}
        {required ? <span className="sr-only"> ({requiredLabel ?? 'จำเป็น'})</span> : null}
      </label>

      {/* The hint id is passed through context-free: children receive it via
          the aria-describedby prop their caller sets from the same value. */}
      <div data-described-by={describedBy}>{children}</div>

      {hint ? (
        <p id={hintId} className="mt-1.5 text-sm text-text-3">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-1.5 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  readonly label: string
  readonly hint?: string
  readonly error?: string
  readonly requiredLabel?: string
}

export function Input({ label, hint, error, required, requiredLabel, className, ...rest }: InputProps) {
  const id = useId()
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(' ')

  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={required}
      requiredLabel={requiredLabel}
    >
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={[CONTROL, error ? 'border-danger' : '', className].filter(Boolean).join(' ')}
        {...rest}
      />
    </FieldShell>
  )
}

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  readonly label: string
  readonly hint?: string
  readonly error?: string
}

export function Textarea({ label, hint, error, required, className, ...rest }: TextareaProps) {
  const id = useId()
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(' ')

  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      <textarea
        id={id}
        rows={4}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={[CONTROL, 'py-2.5 leading-relaxed', error ? 'border-danger' : '', className]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      />
    </FieldShell>
  )
}

/**
 * Native <select>, always.
 *
 * A custom listbox would need to reimplement keyboard navigation, type-ahead,
 * the mobile wheel picker and screen reader announcements. The chevron sits on
 * the wrapper rather than the control because the control's own box does not
 * contain the icon.
 */
export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  readonly label: string
  readonly hint?: string
  readonly error?: string
  readonly options: readonly { value: string; label: string }[]
}

export function Select({ label, hint, error, required, options, className, ...rest }: SelectProps) {
  const id = useId()
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(' ')

  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      <div className="relative">
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={[CONTROL, 'appearance-none pr-10', error ? 'border-danger' : '', className]
            .filter(Boolean)
            .join(' ')}
          {...rest}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-3"
        >
          ▾
        </span>
      </div>
    </FieldShell>
  )
}

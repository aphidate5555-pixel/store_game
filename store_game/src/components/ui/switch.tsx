'use client'

import { useId } from 'react'

/**
 * Toggle built on a real checkbox rather than a div with a click handler, so
 * it is reachable by keyboard, announced correctly and submitted with a form
 * without any extra work.
 */
export function Switch({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  hint?: string
  disabled?: boolean
}) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="text-sm font-medium text-text cursor-pointer">
          {label}
        </label>
        {hint ? (
          <p id={hintId} className="mt-0.5 text-sm text-text-3">
            {hint}
          </p>
        ) : null}
      </div>

      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        aria-describedby={hintId}
        onChange={(event) => onChange(event.target.checked)}
        className={[
          'relative h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full border border-line',
          'bg-surface-2 transition-[background-color,border-color] duration-micro ease-out-soft',
          'focus-ring disabled:cursor-not-allowed disabled:opacity-50',
          'before:absolute before:top-0.5 before:left-0.5 before:h-4 before:w-4',
          'before:rounded-full before:bg-text before:transition-transform before:duration-micro',
          checked ? 'bg-primary border-primary' : '',
          checked ? 'before:translate-x-5' : '',
        ].join(' ')}
      />
    </div>
  )
}

export function ToggleRow({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  hint?: string
  disabled?: boolean
}) {
  return <Switch checked={checked} onChange={onChange} label={label} hint={hint} disabled={disabled} />
}

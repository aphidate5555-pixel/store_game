'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'

import { signInAdminAction } from '@/lib/auth/sign-in'
import { t } from '@/lib/i18n/th/admin'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-12 w-full rounded-lg bg-primary text-base font-medium text-on-primary transition-[background-color] duration-micro hover:brightness-95 disabled:opacity-60 focus-ring"
    >
      {pending ? t('admin.login.submitting') : t('admin.login.submit')}
    </button>
  )
}

export function LoginForm({
  next,
  initialError,
}: {
  next: string
  initialError: string | null
}) {
  const [state, formAction] = useActionState(signInAdminAction, { error: initialError })
  const [showPassword, setShowPassword] = useState(false)

  return (
    <form action={formAction} className="space-y-4">
      {/*
        `next` is re-validated on the server inside signInAdminAction, so a
        crafted value in the form cannot bounce the redirect anywhere outside
        /admin even though the hidden field is editable.
      */}
      <input type="hidden" name="next" value={next} />

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-text-2">
          {t('admin.login.email')}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          placeholder={t('admin.login.emailPlaceholder')}
          className="mt-1.5 min-h-11 w-full rounded-lg border border-line bg-surface-2 px-3 text-base text-text placeholder:text-text-3 focus-ring"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-text-2">
          {t('admin.login.password')}
        </label>
        <div className="relative mt-1.5">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            minLength={6}
            placeholder={t('admin.login.passwordPlaceholder')}
            className="min-h-11 w-full rounded-lg border border-line bg-surface-2 px-3 pr-12 text-base text-text placeholder:text-text-3 focus-ring"
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? t('admin.login.hidePassword') : t('admin.login.showPassword')}
            aria-pressed={showPassword}
            className="absolute right-0 top-0 grid size-11 place-items-center rounded-lg text-text-3 hover:text-text focus-ring"
          >
            {showPassword ? (
              <EyeOff size={18} aria-hidden="true" />
            ) : (
              <Eye size={18} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-text"
        >
          {state.error}
        </p>
      ) : null}

      <SubmitButton />

      {/*
        Deliberately does not explain how to become an administrator: the
        login page would then document the path to the admin account as
        clearly as it does to the owner.
      */}
      <p className="text-center text-xs text-text-3">{t('admin.login.noAccountHint')}</p>

      <p className="text-center">
        <Link href="/" className="text-sm text-text-2 underline underline-offset-4 focus-ring rounded">
          {t('admin.login.backToStore')}
        </Link>
      </p>
    </form>
  )
}

'use server'

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

/**
 * Sign in.
 *
 * The failure message is deliberately uniform: it never distinguishes a wrong
 * password from an account that holds no admin grant, because that difference
 * would turn this form into an oracle for enumerating public.admins (C-5).
 * The actual authorisation decision happens in requireAdmin(), after the
 * session exists, and produces the 403 page.
 */
export async function signInAdminAction(
  _prev: { error: string | null } | null,
  formData: FormData,
): Promise<{ error: string | null }> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (email.length === 0 || password.length < 6) {
    return { error: 'เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบอีเมลและรหัสผ่าน' }
  }

  const supabase = await createServerClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // 429 is the shape Supabase uses for its own rate limit; distinguishing it
    // tells the user to wait, which is actionable, and reveals nothing about
    // any account.
    const message =
      /rate|429|too many/i.test(error.message)
        ? 'พยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่'
        : 'เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบอีเมลและรหัสผ่าน'
    return { error: message }
  }

  const next = String(formData.get('next') ?? '')
  const target = next.startsWith('/admin') ? next : '/admin'
  redirect(target)
}

export async function signOutAdmin(): Promise<void> {
  const supabase = await createServerClient()
  await supabase.auth.signOut()
  redirect('/admin/login')
}

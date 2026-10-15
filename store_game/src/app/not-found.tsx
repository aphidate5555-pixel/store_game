import Link from 'next/link'

/**
 * The site-wide 404, including for URLs under /admin.
 *
 * Written in Thai directly rather than through the message map: this file
 * renders when the app shell itself has failed, and importing the dictionary
 * here would make a failure in the dictionary take the 404 down with it. The
 * duplication is deliberate and is the only place it exists.
 */
export default function RootNotFound() {
  return (
    <html lang="th">
      <body className="min-h-svh bg-ink text-text antialiased">
        <main id="main" className="grid min-h-svh place-items-center px-4">
          <div className="max-w-md text-center">
            <p className="text-sm text-text-3">404</p>
            <h1 className="mt-2 text-lg font-semibold text-text">ไม่พบหน้าที่คุณค้นหา</h1>
            <p className="mt-2 text-sm text-text-2">ลองตรวจสอบ URL หรือกลับไปหน้าหลัก</p>

            <Link
              href="/"
              className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-on-primary focus-ring"
            >
              กลับหน้าหลัก
            </Link>
          </div>
        </main>
      </body>
    </html>
  )
}

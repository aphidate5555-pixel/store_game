'use client'

/**
 * The last line of defence: an error thrown by the root layout itself.
 *
 * Two things are unusual here and both are forced by that.
 *
 * 1. It renders its own <html> and <body>. By the time this runs, the layout
 *    that would normally provide them has already thrown.
 *
 * 2. It imports nothing from the project. Not the dictionary, not a shared
 *    component, not a font. A page whose only job is to survive a broken
 *    shell cannot depend on that shell — if the failure was in i18n or in a
 *    component that CSS depends on, importing either would reproduce it here.
 *    The Thai strings below are duplicated from the dictionary on purpose.
 *
 * The styles are inline React objects because the stylesheet is very likely
 * what failed to load.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="th">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#08080A',
          color: '#F5F5F7',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '1rem',
        }}
      >
        <div style={{ maxWidth: '28rem', textAlign: 'center' }}>
          <p style={{ color: '#7C7C8A', fontSize: '0.875rem', margin: 0 }}>500</p>

          <h1 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0.5rem 0 0' }}>
            เว็บไซต์เกิดข้อผิดพลาด
          </h1>

          <p style={{ color: '#A8A8B3', fontSize: '0.875rem', margin: '0.5rem 0 0' }}>
            ขออภัยในความไม่สะดวก กรุณาลองโหลดหน้านี้อีกครั้ง
          </p>

          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: '1.5rem',
              minHeight: 44,
              padding: '0 1rem',
              borderRadius: '0.5rem',
              border: 'none',
              backgroundColor: '#E11D2E',
              color: '#FFFFFF',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            โหลดหน้านี้อีกครั้ง
          </button>

          {/* The digest is safe to show and is what a support request needs;
              the message is not, because it can carry a query or a table name. */}
          {error.digest ? (
            <p style={{ color: '#7C7C8A', fontSize: '0.75rem', marginTop: '1.5rem' }}>
              รหัสอ้างอิง: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  )
}

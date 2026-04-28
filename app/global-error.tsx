'use client'

import { useEffect } from 'react'
import logger from '@/lib/logger'

// Top-level fallback for errors that escape every other boundary, including
// errors in the root layout. Must render its own <html>/<body>.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logger.error('[global] unhandled error', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    })
  }, [error])

  return (
    <html>
      <body>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            fontFamily:
              'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            color: '#111',
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Something went wrong</h2>
          <p style={{ fontSize: 14, color: '#666' }}>
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              height: 36,
              padding: '0 16px',
              borderRadius: 6,
              background: '#2b579a',
              color: '#fff',
              fontSize: 14,
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}

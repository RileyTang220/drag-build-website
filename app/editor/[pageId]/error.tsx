'use client'

import { useEffect } from 'react'
import logger from '@/lib/logger'

// Next.js segment error boundary for the editor route.
// Catches errors thrown in server components / data loaders that the React
// ErrorBoundary cannot reach.
export default function EditorRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logger.error('[editor] route error', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    })
  }, [error])

  return (
    <div className="h-screen flex flex-col items-center justify-center gap-3 bg-[#1e1e1e] text-white">
      <h2 className="text-lg font-semibold">Editor failed to load</h2>
      <p className="text-sm text-[#cccccc]">
        {process.env.NODE_ENV !== 'production' ? error.message : 'Something went wrong.'}
      </p>
      <button
        onClick={reset}
        className="h-9 px-4 rounded bg-[#0e639c] text-white text-sm font-medium hover:bg-[#1177bb]"
      >
        Try again
      </button>
    </div>
  )
}

// Reusable client-side React error boundary.
//
// Why a Class component? React only lets Class components catch render errors
// via getDerivedStateFromError / componentDidCatch. There is still no hook
// equivalent in React 19.
//
// Use this around large client-only subtrees (Editor, RuntimeRenderer) where
// a single bad node should NOT white-screen the whole app. For Next.js
// segment-level errors (loaders, data fetches, server components), prefer
// the built-in `error.tsx` file convention.
'use client'

import React from 'react'
import logger from '@/lib/logger'

interface ErrorBoundaryProps {
  children: React.ReactNode
  /** Custom fallback. Receives the error and a reset function. */
  fallback?: (error: Error, reset: () => void) => React.ReactNode
  /** Optional label for logs / monitoring (e.g. "Editor", "Runtime"). */
  scope?: string
  /** Hook to forward errors to a monitoring SDK (Sentry, etc.). */
  onError?: (error: Error, info: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const scope = this.props.scope ?? 'unknown'
    logger.error(`[ErrorBoundary:${scope}] ${error.message}`, {
      stack: error.stack,
      componentStack: info.componentStack,
    })
    this.props.onError?.(error, info)
  }

  reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (error) {
      if (this.props.fallback) return this.props.fallback(error, this.reset)
      return <DefaultFallback error={error} reset={this.reset} scope={this.props.scope} />
    }
    return this.props.children
  }
}

interface DefaultFallbackProps {
  error: Error
  reset: () => void
  scope?: string
}

function DefaultFallback({ error, reset, scope }: DefaultFallbackProps) {
  const isDev = process.env.NODE_ENV !== 'production'
  return (
    <div
      role="alert"
      className="min-h-[240px] w-full flex flex-col items-center justify-center gap-3 p-8 bg-white"
    >
      <div className="text-base font-semibold text-gray-900">
        Something went wrong
      </div>
      <div className="text-sm text-gray-500 max-w-md text-center">
        {scope ? `An error occurred in the ${scope}.` : 'An unexpected error occurred.'}{' '}
        You can try again, or refresh the page.
      </div>
      {isDev && (
        <pre className="text-xs text-red-600 bg-red-50 border border-red-100 rounded p-3 max-w-xl overflow-auto">
          {error.message}
        </pre>
      )}
      <div className="flex gap-2 mt-1">
        <button
          onClick={reset}
          className="h-9 px-4 rounded bg-[#2b579a] text-white text-sm font-medium hover:bg-[#234a7f]"
        >
          Try again
        </button>
        <button
          onClick={() => window.location.reload()}
          className="h-9 px-4 rounded border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
        >
          Reload
        </button>
      </div>
    </div>
  )
}

// Public page route - renders published pages.
//
// `?preview=mobile|tablet|desktop` query forces a specific breakpoint
// instead of deriving it from the viewport. The editor's "Preview"
// button uses this so authors can verify their tablet/mobile overrides
// from a desktop browser without resizing the window.
'use client'

import { useEffect, useState, use } from 'react'
import { useSearchParams } from 'next/navigation'
import { RuntimeRenderer } from '@/components/runtime/RuntimeRenderer'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { PageSchema } from '@/types/schema'
import { BREAKPOINTS, type Breakpoint } from '@/lib/editor/breakpoints'

function parseBreakpoint(value: string | null): Breakpoint | undefined {
  if (!value) return undefined
  return (BREAKPOINTS as readonly string[]).includes(value)
    ? (value as Breakpoint)
    : undefined
}

export default function PublicPage({ params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = use(params)
  const searchParams = useSearchParams()
  const forceBreakpoint = parseBreakpoint(searchParams.get('preview'))
  const [schema, setSchema] = useState<PageSchema | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const loadPublishedPage = async () => {
      try {
        const res = await fetch(`/api/public/${pageId}`)
        if (!res.ok) {
          throw new Error('Page not found or not published')
        }
        const data = await res.json()
        if (!cancelled) setSchema(data.schema as PageSchema)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load page')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadPublishedPage()
    return () => {
      cancelled = true
    }
  }, [pageId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading page...</div>
      </div>
    )
  }

  if (error || !schema) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">{error || 'Page not found'}</div>
      </div>
    )
  }

  // Wrap the runtime in an error boundary so a single malformed node never
  // white-screens the published page for end users.
  return (
    <ErrorBoundary scope="Runtime">
      <RuntimeRenderer
        schema={schema}
        pageId={pageId}
        forceBreakpoint={forceBreakpoint}
      />
      {forceBreakpoint && <PreviewBanner breakpoint={forceBreakpoint} />}
    </ErrorBoundary>
  )
}

function PreviewBanner({ breakpoint }: { breakpoint: Breakpoint }) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#0f172a] text-white text-xs px-3 py-1.5 rounded-full shadow-lg z-50">
      Preview · {breakpoint}
    </div>
  )
}

// Public page route - renders published pages
'use client'

import { useEffect, useState, use } from 'react'
import { RuntimeRenderer } from '@/components/runtime/RuntimeRenderer'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { PageSchema } from '@/types/schema'

export default function PublicPage({ params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = use(params)
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
      <RuntimeRenderer schema={schema} pageId={pageId} />
    </ErrorBoundary>
  )
}

// Public page route - renders published pages
'use client'

import { useEffect, useState, use } from 'react'
import { RuntimeRenderer } from '@/components/runtime/RuntimeRenderer'
import { PageSchema } from '@/types/schema'

export default function PublicPage({ params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = use(params)
  const [schema, setSchema] = useState<PageSchema | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadPublishedPage = async () => {
      try {
        const res = await fetch(`/api/public/${pageId}`)
        if (!res.ok) {
          throw new Error('Page not found or not published')
        }
        const data = await res.json()
        setSchema(data.schema as PageSchema)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load page')
      } finally {
        setLoading(false)
      }
    }

    loadPublishedPage()
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

  return <RuntimeRenderer schema={schema} />
}

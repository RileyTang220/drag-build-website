// Submissions dashboard — owner-only view of every form submission a
// published page has received. Cursor-paginated; supports deleting spam.
'use client'

import { use, useCallback, useEffect, useState } from 'react'
import { useSession, signIn } from 'next-auth/react'
import Link from 'next/link'

interface Submission {
  id: string
  data: Record<string, unknown>
  submittedAt: string
  ip: string | null
  userAgent: string | null
}

interface PageMeta {
  id: string
  title: string
}

interface ListResponse {
  page: PageMeta
  items: Submission[]
  nextCursor: string | null
}

const PAGE_SIZE = 25

export default function SubmissionsPage({ params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = use(params)
  const { status } = useSession()

  const [page, setPage] = useState<PageMeta | null>(null)
  const [items, setItems] = useState<Submission[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(
    async (cursor?: string) => {
      const url = new URL(`/api/forms/${pageId}`, window.location.origin)
      url.searchParams.set('limit', String(PAGE_SIZE))
      if (cursor) url.searchParams.set('cursor', cursor)
      const res = await fetch(url.toString())
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error?.message || `HTTP ${res.status}`)
      }
      const data = (await res.json()) as ListResponse
      return data
    },
    [pageId],
  )

  useEffect(() => {
    if (status === 'unauthenticated') {
      signIn('google')
      return
    }
    if (status !== 'authenticated') return

    let cancelled = false
    setLoading(true)
    setError(null)
    load()
      .then((data) => {
        if (cancelled) return
        setPage(data.page)
        setItems(data.items)
        setNextCursor(data.nextCursor)
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [status, load])

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const data = await load(nextCursor)
      setItems((prev) => [...prev, ...data.items])
      setNextCursor(data.nextCursor)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load more')
    } finally {
      setLoadingMore(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this submission? This cannot be undone.')) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/forms/${pageId}/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error?.message || `HTTP ${res.status}`)
      }
      setItems((prev) => prev.filter((s) => s.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete')
    } finally {
      setDeleting(null)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
        <div className="w-8 h-8 border-2 border-[#2b579a] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">
            ← My Sites
          </Link>
          <span className="w-px h-5 bg-gray-200" />
          <span className="text-lg font-semibold text-[#162d3d]">
            Submissions{page ? ` · ${page.title}` : ''}
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link
            href={`/editor/${pageId}`}
            className="text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded hover:bg-gray-100"
          >
            Edit page
          </Link>
          <Link
            href={`/p/${pageId}`}
            target="_blank"
            className="text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded hover:bg-gray-100"
          >
            View published
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}

        {items.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center text-2xl">
              ✉
            </div>
            <h2 className="text-lg font-medium text-gray-800 mb-1">No submissions yet</h2>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Once your published page receives a form submission, it&apos;ll show up here.
              Make sure your page has a Button with action set to &ldquo;Submit form&rdquo;.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {items.length} {items.length === 1 ? 'submission' : 'submissions'}
                  {nextCursor ? ' (more available)' : ''}
                </span>
              </div>
              <ul className="divide-y divide-gray-100">
                {items.map((sub) => (
                  <li key={sub.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-500 mb-1">
                          {new Date(sub.submittedAt).toLocaleString()}
                          {sub.ip ? ` · ${sub.ip}` : ''}
                        </div>
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                          {Object.entries(sub.data ?? {}).map(([k, v]) => (
                            <div key={k} className="flex gap-2 min-w-0">
                              <dt className="font-medium text-gray-700 flex-shrink-0">{k}:</dt>
                              <dd className="text-gray-900 break-words min-w-0">{String(v)}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                      <button
                        onClick={() => remove(sub.id)}
                        disabled={deleting === sub.id}
                        className="text-xs text-red-500 hover:text-red-700 disabled:opacity-60"
                      >
                        {deleting === sub.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              {nextCursor && (
                <div className="border-t border-gray-100 p-3 text-center">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="text-sm text-[#2b579a] hover:underline disabled:opacity-60"
                  >
                    {loadingMore ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

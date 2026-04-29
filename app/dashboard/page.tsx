// Dashboard - Wix-style page list and creation
'use client'

import { useEffect, useState } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PagePreview } from '@/components/dashboard/PagePreview'
import type { PageSchema } from '@/types/schema'

interface Page {
  id: string
  title: string
  slug: string | null
  publishedVersionId: string | null
  /** Optional — server omits or returns null for legacy pages without a draft. */
  draftSchema: PageSchema | null
  createdAt: string
  updatedAt: string
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      signIn('google')
      return
    }

    if (status === 'authenticated') {
      fetchPages()
    }
  }, [status])

  const fetchPages = async () => {
    try {
      const res = await fetch('/api/pages')
      const data = await res.json()
      setPages(data.pages || [])
    } catch (error) {
      console.error('Error fetching pages:', error)
    } finally {
      setLoading(false)
    }
  }

  const goToTemplates = () => router.push('/templates')

  const deletePage = async (pageId: string) => {
    if (!confirm('Are you sure you want to delete this page?')) return
    try {
      await fetch(`/api/pages/${pageId}`, { method: 'DELETE' })
      fetchPages()
    } catch (error) {
      console.error('Error deleting page:', error)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
        <div className="w-8 h-8 border-2 border-[#2b579a] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Header */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xl font-semibold text-[#162d3d]">My Sites</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{session.user?.email}</span>
          <button
            onClick={goToTemplates}
            className="h-9 px-5 bg-[#2b579a] text-white text-sm font-medium rounded hover:bg-[#234a7f] transition-colors"
          >
            + Create New Site
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        {pages.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-[#e8f0fe] flex items-center justify-center">
              <svg className="w-12 h-12 text-[#2b579a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Create your first site</h2>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Drag and drop to build your site. Add text, images, buttons and more.
            </p>
            <button
              onClick={goToTemplates}
              className="h-11 px-8 bg-[#2b579a] text-white font-medium rounded-lg hover:bg-[#234a7f] transition-colors"
            >
              Get Started
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {pages.map((page) => (
              <div
                key={page.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
              >
                <Link href={`/editor/${page.id}`} className="block">
                  <PagePreview
                    schema={page.draftSchema}
                    className="aspect-[4/3]"
                  />
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900 truncate">{page.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Updated {new Date(page.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
                <div className="px-4 pb-4 flex gap-2 flex-wrap">
                  <Link
                    href={`/editor/${page.id}`}
                    className="flex-1 min-w-[60px] py-2 text-center text-sm font-medium text-[#2b579a] hover:bg-[#e8f0fe] rounded-lg transition-colors"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/submissions/${page.id}`}
                    className="py-2 px-3 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="View form submissions"
                  >
                    Inbox
                  </Link>
                  {page.publishedVersionId && (
                    <Link
                      href={`/p/${page.id}`}
                      target="_blank"
                      className="py-2 px-3 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      View
                    </Link>
                  )}
                  <button
                    onClick={(e) => { e.preventDefault(); deletePage(page.id) }}
                    className="py-2 px-3 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

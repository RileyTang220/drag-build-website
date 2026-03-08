// Dashboard page - List and manage user's pages
'use client'

import { useEffect, useState } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Page {
  id: string
  title: string
  slug: string | null
  publishedVersionId: string | null
  createdAt: string
  updatedAt: string
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

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

  const createPage = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Untitled Page',
        }),
      })
      const data = await res.json()
      if (data.page) {
        router.push(`/editor/${data.page.id}`)
      }
    } catch (error) {
      console.error('Error creating page:', error)
    } finally {
      setCreating(false)
    }
  }

  const deletePage = async (pageId: string) => {
    if (!confirm('Are you sure you want to delete this page?')) {
      return
    }

    try {
      await fetch(`/api/pages/${pageId}`, {
        method: 'DELETE',
      })
      fetchPages()
    } catch (error) {
      console.error('Error deleting page:', error)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">My Pages</h1>
          <button
            onClick={createPage}
            disabled={creating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create New Page'}
          </button>
        </div>

        {pages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No pages yet. Create your first page!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pages.map((page) => (
              <div
                key={page.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <h2 className="text-xl font-semibold mb-2">{page.title}</h2>
                <div className="text-sm text-gray-500 mb-4">
                  Updated: {new Date(page.updatedAt).toLocaleDateString()}
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/editor/${page.id}`}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded text-center hover:bg-blue-700"
                  >
                    Edit
                  </Link>
                  {page.publishedVersionId && (
                    <Link
                      href={`/p/${page.id}`}
                      target="_blank"
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      View
                    </Link>
                  )}
                  <button
                    onClick={() => deletePage(page.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Templates gallery — pick a template (or start blank) to create a new page.
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signIn } from 'next-auth/react'
import Link from 'next/link'
import { getDefaultCanvasSize } from '@/lib/editorLayout'
import type { TemplateMeta } from '@/lib/templates/types'

const CATEGORY_LABEL: Record<TemplateMeta['category'], string> = {
  blank: 'Blank',
  business: 'Business',
  food: 'Food & Drink',
  portfolio: 'Portfolio',
  landing: 'Landing',
}

export default function TemplatesPage() {
  const router = useRouter()
  const { status } = useSession()
  const [templates, setTemplates] = useState<TemplateMeta[]>([])
  const [creatingId, setCreatingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/templates')
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates ?? []))
      .catch(() => setError('Failed to load templates'))
  }, [])

  const create = async (templateId: string | null) => {
    if (status === 'unauthenticated') {
      signIn('google')
      return
    }
    setCreatingId(templateId ?? 'blank')
    setError(null)
    try {
      const body: Record<string, unknown> = {}
      if (templateId) {
        body.templateId = templateId
      } else {
        const { width, height } = getDefaultCanvasSize(window.innerWidth, window.innerHeight)
        body.title = 'Untitled Page'
        body.canvasWidth = width
        body.canvasHeight = height
      }

      const res = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error?.message || `HTTP ${res.status}`)
      }
      const data = await res.json()
      if (data.page?.id) {
        router.push(`/editor/${data.page.id}`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create page')
      setCreatingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* ── Header ── */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">
            ← My Sites
          </Link>
          <span className="w-px h-5 bg-gray-200" />
          <span className="text-lg font-semibold text-[#162d3d]">Choose a Template</span>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Start with a template</h1>
          <p className="text-gray-500">
            Pick a polished starting point — every element is fully editable.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Blank tile */}
          <button
            onClick={() => create(null)}
            disabled={creatingId !== null}
            className="bg-white rounded-xl border-2 border-dashed border-gray-300 hover:border-[#2b579a] hover:shadow-md transition-all overflow-hidden text-left disabled:opacity-60 disabled:cursor-wait"
          >
            <div className="aspect-[16/10] bg-gray-50 flex items-center justify-center">
              <div className="flex flex-col items-center text-gray-400">
                <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m6-6H6" />
                </svg>
                <span className="text-sm">Start fresh</span>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Blank Page</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {CATEGORY_LABEL.blank}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">An empty canvas. Build from scratch.</p>
              <span className="inline-block mt-3 text-sm text-[#2b579a] font-medium">
                {creatingId === 'blank' ? 'Creating...' : 'Use blank →'}
              </span>
            </div>
          </button>

          {/* Template tiles */}
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => create(t.id)}
              disabled={creatingId !== null}
              className="bg-white rounded-xl border border-gray-200 hover:border-[#2b579a] hover:shadow-md transition-all overflow-hidden text-left disabled:opacity-60 disabled:cursor-wait"
            >
              <div
                className="aspect-[16/10] bg-gray-50 flex items-center justify-center overflow-hidden"
                // dangerouslySetInnerHTML is acceptable here because thumbnails
                // are static, hand-authored SVG strings shipped from our own
                // codebase — never user-generated.
                dangerouslySetInnerHTML={{ __html: t.thumbnailSvg }}
              />
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">{t.name}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-[#2b579a]">
                    {CATEGORY_LABEL[t.category]}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{t.description}</p>
                <span className="inline-block mt-3 text-sm text-[#2b579a] font-medium">
                  {creatingId === t.id ? 'Creating...' : 'Use this template →'}
                </span>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}

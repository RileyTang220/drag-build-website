// Templates gallery — pick a template (or start blank) to create a new page.
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signIn } from 'next-auth/react'
import Link from 'next/link'
import { getDefaultCanvasSize } from '@/lib/editorLayout'
import type { TemplateMeta } from '@/lib/templates/types'
import { readSseEvents } from '@/lib/sse'

const CATEGORY_LABEL: Record<TemplateMeta['category'], string> = {
  blank: 'Blank',
  business: 'Business',
  food: 'Food & Drink',
  portfolio: 'Portfolio',
  landing: 'Landing',
}

const AI_PROMPT_EXAMPLES = [
  'A coffee shop landing page with hero image, today\'s menu, opening hours, and a contact form.',
  'A photographer portfolio with 6 image grid, an "About" section, and a quote-request form.',
  'A SaaS landing page for a focus-timer app — hero, three feature cards, pricing, and FAQ.',
] as const

const AI_MIN_LEN = 10
const AI_MAX_LEN = 1000
/** Empirically a typical full schema is 3,000–6,000 chars. Drives the
 *  progress bar; capped at 95% until the `done` event fires. */
const AI_PROGRESS_TARGET_CHARS = 5000

type Phase = 'connecting' | 'generating' | 'validating' | 'saving' | 'done'

const PHASE_LABEL: Record<Phase, string> = {
  connecting: 'Connecting to model…',
  generating: 'Generating layout…',
  validating: 'Validating schema…',
  saving: 'Creating your page…',
  done: 'Done',
}

type StreamEvent =
  | { type: 'phase'; phase: Phase }
  | { type: 'progress'; chars: number }
  | { type: 'done'; pageId: string; title: string }
  | { type: 'error'; message: string }

export default function TemplatesPage() {
  const router = useRouter()
  const { status } = useSession()
  const [templates, setTemplates] = useState<TemplateMeta[]>([])
  const [creatingId, setCreatingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [aiPhase, setAiPhase] = useState<Phase | null>(null)
  const [aiChars, setAiChars] = useState(0)

  useEffect(() => {
    fetch('/api/templates')
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates ?? []))
      .catch(() => setError('Failed to load templates'))
  }, [])

  const generateWithAi = async () => {
    if (status === 'unauthenticated') {
      signIn('google')
      return
    }
    const prompt = aiPrompt.trim()
    if (prompt.length < AI_MIN_LEN) {
      setError(`Add at least ${AI_MIN_LEN} characters describing the site.`)
      return
    }
    setAiBusy(true)
    setAiPhase('connecting')
    setAiChars(0)
    setError(null)

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })

      // Pre-flight (auth, rate limit, missing API key) returns plain JSON
      // with the apiError shape — peel it off and surface the message.
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error?.message || `HTTP ${res.status}`)
      }

      // Success: server is now streaming SSE events. Walk them.
      let pageId: string | null = null
      for await (const event of readSseEvents<StreamEvent>(res)) {
        if (event.type === 'phase') {
          setAiPhase(event.phase)
        } else if (event.type === 'progress') {
          setAiChars(event.chars)
        } else if (event.type === 'done') {
          pageId = event.pageId
          setAiPhase('done')
        } else if (event.type === 'error') {
          throw new Error(event.message)
        }
      }
      if (pageId) {
        router.push(`/editor/${pageId}`)
      } else {
        throw new Error('Stream ended without a page id')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI generation failed')
      setAiBusy(false)
      setAiPhase(null)
    }
  }

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
        {/* ── AI generator ── */}
        <section className="mb-10 bg-gradient-to-br from-[#0f172a] to-[#1e3a8a] rounded-2xl p-8 text-white shadow-lg">
          <div className="flex items-start justify-between gap-6 mb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/15 text-xs font-medium mb-2">
                <span>✨</span> AI generator
              </div>
              <h2 className="text-2xl font-semibold mb-1">Describe your site, get a draft in seconds</h2>
              <p className="text-blue-100 text-sm">
                Tell the model what kind of page you want. It builds the layout — you fine-tune in the editor.
              </p>
            </div>
          </div>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value.slice(0, AI_MAX_LEN))}
            disabled={aiBusy}
            rows={3}
            placeholder="e.g. A coffee shop landing page with hero image, today's menu, opening hours, and a contact form."
            className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 placeholder-blue-200/60 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/40 disabled:opacity-60"
          />
          <div className="flex items-center justify-between mt-3 text-xs text-blue-100">
            <span>{aiPrompt.length} / {AI_MAX_LEN}</span>
            <button
              onClick={generateWithAi}
              disabled={aiBusy || aiPrompt.trim().length < AI_MIN_LEN}
              className="h-9 px-5 bg-white text-[#0f172a] rounded-md text-sm font-medium hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {aiBusy ? (
                <>
                  <span className="w-3 h-3 border-2 border-[#0f172a] border-t-transparent rounded-full animate-spin" />
                  {aiPhase ? PHASE_LABEL[aiPhase] : 'Generating…'}
                </>
              ) : (
                <>Generate</>
              )}
            </button>
          </div>

          {/* Streaming progress — only visible while a generation is in flight. */}
          {aiBusy && (
            <AiProgressBar phase={aiPhase} chars={aiChars} />
          )}
          <div className="flex flex-wrap gap-2 mt-4">
            {AI_PROMPT_EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => setAiPrompt(ex)}
                disabled={aiBusy}
                className="text-[11px] px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-blue-100 truncate max-w-xs transition-colors disabled:opacity-60"
                title={ex}
              >
                {ex.length > 60 ? ex.slice(0, 57) + '…' : ex}
              </button>
            ))}
          </div>
        </section>

        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Or start with a template</h1>
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

// ─── Streaming progress UI ────────────────────────────────────────────────────

interface AiProgressBarProps {
  phase: Phase | null
  chars: number
}

function AiProgressBar({ phase, chars }: AiProgressBarProps) {
  // Linear estimate during the (long) `generating` phase, then jump to a
  // fixed near-finish percentage once the stream moves past it. Capped at
  // 95% until `done` so the UI never falsely claims completion.
  let pct = 5
  if (phase === 'connecting') pct = 5
  else if (phase === 'generating') {
    pct = Math.min(85, 10 + (chars / AI_PROGRESS_TARGET_CHARS) * 75)
  } else if (phase === 'validating') pct = 90
  else if (phase === 'saving') pct = 95
  else if (phase === 'done') pct = 100

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-between text-xs text-blue-100">
        <span>{phase ? PHASE_LABEL[phase] : ''}</span>
        {phase === 'generating' && (
          <span className="tabular-nums opacity-80">{chars.toLocaleString()} chars</span>
        )}
      </div>
      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-white/80 rounded-full transition-all duration-200 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

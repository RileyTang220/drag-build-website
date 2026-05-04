// POST /api/ai/generate — turn a natural-language brief into a new Page.
//
// Two response modes share one route:
//   - Pre-flight failures (auth, Zod, rate limit, missing API key)
//     return a normal JSON 4xx/5xx response. Easy for the client to
//     branch on `res.ok`.
//   - On success, the route returns a Server-Sent Events stream that
//     reports progress as Anthropic produces the tool input. The client
//     reads the stream incrementally; we never buffer the whole reply
//     before showing the user something.
//
// Why SSE not WebSocket: this is one-way (server → client) and the
// browser's fetch + ReadableStream is enough. WS would add a separate
// upgrade handshake plus connection management.
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@/generated/prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiError, parseJsonBody } from '@/lib/validation/apiError'
import { AI_LIMITS, aiGenerateInput } from '@/lib/validation/aiGenerate'
import { streamGeneratePage } from '@/lib/ai/generatePage'
import logger from '@/lib/logger'

const userTimestamps = new Map<string, number[]>()

function rateLimit(userId: string): boolean {
  const now = Date.now()
  const windowStart = now - AI_LIMITS.RATE_WINDOW_MS
  const recent = (userTimestamps.get(userId) ?? []).filter((t) => t >= windowStart)
  if (recent.length >= AI_LIMITS.RATE_MAX_PER_WINDOW) {
    userTimestamps.set(userId, recent)
    return true
  }
  recent.push(now)
  userTimestamps.set(userId, recent)
  return false
}

type StreamEvent =
  | { type: 'phase'; phase: 'connecting' | 'generating' | 'validating' | 'saving' }
  | { type: 'progress'; chars: number }
  | { type: 'done'; pageId: string; title: string }
  | { type: 'error'; message: string }

export async function POST(request: NextRequest) {
  // ── Pre-flight gates ──────────────────────────────────────────────────────
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return apiError('UNAUTHORIZED', 'Sign in required')
  }

  const parsed = await parseJsonBody(request, aiGenerateInput)
  if ('response' in parsed) return parsed.response

  if (rateLimit(session.user.id)) {
    return apiError(
      'PAYLOAD_TOO_LARGE',
      `Rate limit exceeded — max ${AI_LIMITS.RATE_MAX_PER_WINDOW} generations per hour`,
    )
  }

  if (!process.env.DEEPSEEK_API_KEY) {
    logger.error('[ai] missing DEEPSEEK_API_KEY')
    return apiError('INTERNAL', 'AI generation is not configured on this server')
  }

  // ── Streamed response ─────────────────────────────────────────────────────
  const userId = session.user.id
  const prompt = parsed.data.prompt
  const t0 = Date.now()

  const encoder = new TextEncoder()
  const sseStream = new ReadableStream({
    async start(controller) {
      let closed = false
      const send = (event: StreamEvent) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch {
          // Client disconnected; subsequent enqueues will throw.
          closed = true
        }
      }

      // Abort the Anthropic call if the client disconnects mid-stream so
      // we don't keep paying tokens for output nobody will read.
      const ac = new AbortController()
      const onAbort = () => ac.abort()
      request.signal.addEventListener('abort', onAbort)

      try {
        const result = await streamGeneratePage({
          prompt,
          signal: ac.signal,
          onPhase: (phase) => send({ type: 'phase', phase }),
          onProgress: (chars) => send({ type: 'progress', chars }),
        })

        send({ type: 'phase', phase: 'saving' })

        const page = await prisma.page.create({
          data: {
            title: result.title,
            ownerId: userId,
            draftSchema: result.schema as unknown as Prisma.InputJsonValue,
          },
        })

        logger.info('[ai] generated page', {
          ownerId: userId,
          ms: Date.now() - t0,
          stopReason: result.stopReason,
          title: result.title,
          nodes: result.schema.nodes.length,
        })

        send({ type: 'done', pageId: page.id, title: page.title })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Generation failed'
        logger.error('[ai] stream failed', { message })
        send({ type: 'error', message })
      } finally {
        request.signal.removeEventListener('abort', onAbort)
        if (!closed) {
          try {
            controller.close()
          } catch {
            // already closed
          }
        }
      }
    },
  })

  return new Response(sseStream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      // Disable any intermediate buffering — we want the bytes flushed
      // to the client as soon as we enqueue them.
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    },
  })
}

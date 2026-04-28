// Form submission endpoints.
//
//   POST /api/forms/[pageId] — public; site visitors submit forms here.
//   GET  /api/forms/[pageId] — owner only; lists submissions.
//
// POST is intentionally NOT auth-gated because end users of a published
// page are anonymous. Defenses live elsewhere:
//   - Page must have an active publishedVersion (private drafts can't
//     receive submissions)
//   - Per-IP rate limit (DB-backed; works correctly across serverless
//     instances)
//   - Strict Zod shape + size limits (see lib/validation/formSubmission)
//   - IP and User-Agent stored for downstream auditing
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@/generated/prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiError, fromZodError, parseJsonBody } from '@/lib/validation/apiError'
import { pageIdParam } from '@/lib/validation/pageSchema'
import {
  FORM_LIMITS,
  formSubmissionInput,
  listSubmissionsQuery,
} from '@/lib/validation/formSubmission'
import logger from '@/lib/logger'

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getClientIp(request: NextRequest): string | undefined {
  // Vercel / standard reverse proxies set x-forwarded-for. Take the FIRST
  // hop — the original client. Subsequent entries are proxies along the way.
  const xff = request.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  const real = request.headers.get('x-real-ip')
  if (real) return real
  return undefined
}

async function isRateLimited(ip: string | undefined, pageId: string): Promise<boolean> {
  if (!ip) return false // can't rate-limit without an IP; fail open
  const since = new Date(Date.now() - FORM_LIMITS.RATE_WINDOW_SECONDS * 1000)
  const count = await prisma.formSubmission.count({
    where: { ip, pageId, submittedAt: { gte: since } },
  })
  return count >= FORM_LIMITS.RATE_MAX_REQUESTS
}

// ─── POST /api/forms/[pageId] ─────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> },
) {
  try {
    const { pageId: rawId } = await params
    const idResult = pageIdParam.safeParse(rawId)
    if (!idResult.success) return fromZodError(idResult.error)
    const pageId = idResult.data

    // Body must parse before anything else — saves a DB round trip on bots
    // hammering the endpoint with junk.
    const parsed = await parseJsonBody(request, formSubmissionInput)
    if ('response' in parsed) return parsed.response

    // Page must exist AND be published. Drafts are owner-only territory.
    const page = await prisma.page.findUnique({
      where: { id: pageId },
      select: { id: true, publishedVersionId: true },
    })
    if (!page || !page.publishedVersionId) {
      return apiError('NOT_FOUND', 'Page not found or not published')
    }

    const ip = getClientIp(request)
    if (await isRateLimited(ip, pageId)) {
      return apiError(
        'PAYLOAD_TOO_LARGE',
        `Rate limit exceeded — max ${FORM_LIMITS.RATE_MAX_REQUESTS} per ${FORM_LIMITS.RATE_WINDOW_SECONDS}s`,
      )
    }

    // Cap the User-Agent at 1KB so a huge crafted UA can't bloat rows.
    const userAgent = request.headers.get('user-agent')?.slice(0, 1024) ?? null

    const submission = await prisma.formSubmission.create({
      data: {
        pageId,
        data: parsed.data.fields as unknown as Prisma.InputJsonValue,
        ip: ip ?? null,
        userAgent,
      },
      select: { id: true, submittedAt: true },
    })

    logger.info('[forms] submission stored', { pageId, submissionId: submission.id, ip })

    return NextResponse.json({ ok: true, id: submission.id, submittedAt: submission.submittedAt })
  } catch (error) {
    logger.error('POST /api/forms/[pageId] failed', error)
    return apiError('INTERNAL', 'Failed to submit form')
  }
}

// ─── GET /api/forms/[pageId] ──────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return apiError('UNAUTHORIZED', 'Sign in required')

    const { pageId: rawId } = await params
    const idResult = pageIdParam.safeParse(rawId)
    if (!idResult.success) return fromZodError(idResult.error)
    const pageId = idResult.data

    // Owner check before exposing any submission data.
    const page = await prisma.page.findFirst({
      where: { id: pageId, ownerId: session.user.id },
      select: { id: true, title: true },
    })
    if (!page) return apiError('NOT_FOUND', 'Page not found')

    const queryResult = listSubmissionsQuery.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    )
    if (!queryResult.success) return fromZodError(queryResult.error)
    const { limit, cursor } = queryResult.data

    // Cursor pagination: read one extra row to detect more.
    const rows = await prisma.formSubmission.findMany({
      where: { pageId },
      orderBy: { submittedAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: { id: true, data: true, submittedAt: true, ip: true, userAgent: true },
    })

    const hasMore = rows.length > limit
    const items = hasMore ? rows.slice(0, limit) : rows
    const nextCursor = hasMore ? items[items.length - 1]?.id : null

    return NextResponse.json({
      page: { id: page.id, title: page.title },
      items,
      nextCursor,
    })
  } catch (error) {
    logger.error('GET /api/forms/[pageId] failed', error)
    return apiError('INTERNAL', 'Failed to fetch submissions')
  }
}

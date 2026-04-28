// API route for public page access (no authentication required)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, fromZodError } from '@/lib/validation/apiError'
import { pageIdParam } from '@/lib/validation/pageSchema'
import logger from '@/lib/logger'

// GET /api/public/[pageId] - Get published page version
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> },
) {
  try {
    const { pageId: rawId } = await params
    const idResult = pageIdParam.safeParse(rawId)
    if (!idResult.success) return fromZodError(idResult.error)

    const page = await prisma.page.findUnique({
      where: { id: idResult.data },
      include: { publishedVersion: true },
    })

    if (!page || !page.publishedVersion) {
      return apiError('NOT_FOUND', 'Page not found or not published')
    }

    return NextResponse.json({
      schema: page.publishedVersion.schema,
      meta: { title: page.title },
    })
  } catch (error) {
    logger.error('GET /api/public/[pageId] failed', error)
    return apiError('INTERNAL', 'Failed to fetch page')
  }
}

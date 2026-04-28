// API route for publishing pages
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@/generated/prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiError, fromZodError } from '@/lib/validation/apiError'
import { pageIdParam, pageSchemaZ } from '@/lib/validation/pageSchema'
import logger from '@/lib/logger'

// POST /api/pages/[pageId]/publish - Publish page draft to a version
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return apiError('UNAUTHORIZED', 'Sign in required')

    const { pageId: rawId } = await params
    const idResult = pageIdParam.safeParse(rawId)
    if (!idResult.success) return fromZodError(idResult.error)

    // Verify ownership
    const page = await prisma.page.findFirst({
      where: { id: idResult.data, ownerId: session.user.id },
    })
    if (!page) return apiError('NOT_FOUND', 'Page not found')

    // Re-validate the draft before snapshotting it as an immutable version.
    // Drafts are validated on write, but we re-check here to defend against
    // schema changes or any data that bypassed validation historically.
    const draftResult = pageSchemaZ.safeParse(page.draftSchema)
    if (!draftResult.success) return fromZodError(draftResult.error)

    const version = await prisma.pageVersion.create({
      data: {
        pageId: idResult.data,
        schema: draftResult.data as unknown as Prisma.InputJsonValue,
      },
    })

    await prisma.page.update({
      where: { id: idResult.data },
      data: { publishedVersionId: version.id },
    })

    return NextResponse.json({
      success: true,
      versionId: version.id,
      publishedAt: version.publishedAt,
    })
  } catch (error) {
    logger.error('POST /api/pages/[pageId]/publish failed', error)
    return apiError('INTERNAL', 'Failed to publish page')
  }
}

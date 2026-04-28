// API route for individual page operations
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@/generated/prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiError, fromZodError, parseJsonBody } from '@/lib/validation/apiError'
import { pageIdParam, updatePageInput } from '@/lib/validation/pageSchema'
import logger from '@/lib/logger'

// GET /api/pages/[pageId] - Get page draft (owner only)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return apiError('UNAUTHORIZED', 'Sign in required')

    const { pageId: rawId } = await params
    const idResult = pageIdParam.safeParse(rawId)
    if (!idResult.success) return fromZodError(idResult.error)

    const page = await prisma.page.findFirst({
      where: { id: idResult.data, ownerId: session.user.id },
    })

    if (!page) return apiError('NOT_FOUND', 'Page not found')

    return NextResponse.json({ page })
  } catch (error) {
    logger.error('GET /api/pages/[pageId] failed', error)
    return apiError('INTERNAL', 'Failed to fetch page')
  }
}

// PUT /api/pages/[pageId] - Update page draft (owner only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return apiError('UNAUTHORIZED', 'Sign in required')

    const { pageId: rawId } = await params
    const idResult = pageIdParam.safeParse(rawId)
    if (!idResult.success) return fromZodError(idResult.error)

    const parsed = await parseJsonBody(request, updatePageInput)
    if ('response' in parsed) return parsed.response
    const { draftSchema, title, slug } = parsed.data

    // Verify ownership before update
    const existingPage = await prisma.page.findFirst({
      where: { id: idResult.data, ownerId: session.user.id },
      select: { id: true },
    })
    if (!existingPage) return apiError('NOT_FOUND', 'Page not found')

    const page = await prisma.page.update({
      where: { id: idResult.data },
      data: {
        ...(draftSchema !== undefined && {
          draftSchema: draftSchema as unknown as Prisma.InputJsonValue,
        }),
        ...(title !== undefined && { title }),
        ...(slug !== undefined && { slug: slug === '' ? null : slug }),
      },
    })

    return NextResponse.json({ page })
  } catch (error) {
    logger.error('PUT /api/pages/[pageId] failed', error)
    return apiError('INTERNAL', 'Failed to update page')
  }
}

// DELETE /api/pages/[pageId] - Delete page (owner only)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return apiError('UNAUTHORIZED', 'Sign in required')

    const { pageId: rawId } = await params
    const idResult = pageIdParam.safeParse(rawId)
    if (!idResult.success) return fromZodError(idResult.error)

    const page = await prisma.page.findFirst({
      where: { id: idResult.data, ownerId: session.user.id },
      select: { id: true },
    })
    if (!page) return apiError('NOT_FOUND', 'Page not found')

    await prisma.page.delete({ where: { id: idResult.data } })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('DELETE /api/pages/[pageId] failed', error)
    return apiError('INTERNAL', 'Failed to delete page')
  }
}

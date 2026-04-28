// API route for page CRUD operations
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@/generated/prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PageSchema } from '@/types/schema'
import { apiError, parseJsonBody } from '@/lib/validation/apiError'
import { createPageInput } from '@/lib/validation/pageSchema'
import logger from '@/lib/logger'

// GET /api/pages - List all pages for the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return apiError('UNAUTHORIZED', 'Sign in required')
    }

    const pages = await prisma.page.findMany({
      where: { ownerId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        publishedVersionId: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ pages })
  } catch (error) {
    logger.error('GET /api/pages failed', error)
    return apiError('INTERNAL', 'Failed to fetch pages')
  }
}

// POST /api/pages - Create a new page
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return apiError('UNAUTHORIZED', 'Sign in required')
    }

    const parsed = await parseJsonBody(request, createPageInput)
    if ('response' in parsed) return parsed.response
    const { title, slug, canvasWidth, canvasHeight } = parsed.data

    const w =
      typeof canvasWidth === 'number' && Number.isFinite(canvasWidth)
        ? Math.round(Math.min(2560, Math.max(320, canvasWidth)))
        : 1200
    const h =
      typeof canvasHeight === 'number' && Number.isFinite(canvasHeight)
        ? Math.round(Math.min(1600, Math.max(240, canvasHeight)))
        : 800

    const defaultSchema: PageSchema = {
      canvas: { width: w, height: h, background: '#ffffff' },
      nodes: [],
      meta: { title: title || 'Untitled Page' },
    }

    const page = await prisma.page.create({
      data: {
        title: title || 'Untitled Page',
        slug: slug || undefined,
        ownerId: session.user.id,
        draftSchema: defaultSchema as unknown as Prisma.InputJsonValue,
      },
    })

    return NextResponse.json({ page })
  } catch (error) {
    logger.error('POST /api/pages failed', error)
    return apiError('INTERNAL', 'Failed to create page')
  }
}

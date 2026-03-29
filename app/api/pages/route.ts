// API route for page CRUD operations
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@/generated/prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PageSchema } from '@/types/schema'
// GET /api/pages - List all pages for the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const pages = await prisma.page.findMany({
      where: {
        ownerId: session.user.id,
      },
      orderBy: {
        updatedAt: 'desc',
      },
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
    console.error('Error fetching pages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pages' },
      { status: 500 }
    )
  }
}

// POST /api/pages - Create a new page
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, slug, canvasWidth, canvasHeight } = body

    const w =
      typeof canvasWidth === 'number' && Number.isFinite(canvasWidth)
        ? Math.round(Math.min(2560, Math.max(320, canvasWidth)))
        : 1200
    const h =
      typeof canvasHeight === 'number' && Number.isFinite(canvasHeight)
        ? Math.round(Math.min(1600, Math.max(240, canvasHeight)))
        : 800

    // Default empty schema（画布尺寸可由客户端按编辑器可用区域传入）
    const defaultSchema: PageSchema = {
      canvas: {
        width: w,
        height: h,
        background: '#ffffff',
      },
      nodes: [],
      meta: {
        title: title || 'Untitled Page',
      },
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
    console.error('Error creating page:', error)
    return NextResponse.json(
      { error: 'Failed to create page' },
      { status: 500 }
    )
  }
}

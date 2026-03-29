// API route for publishing pages
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@/generated/prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/pages/[pageId]/publish - Publish page draft to a version
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { pageId } = await params
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership
    const page = await prisma.page.findFirst({
      where: {
        id: pageId,
        ownerId: session.user.id,
      },
    })

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    // Create a new immutable version from draft
    const version = await prisma.pageVersion.create({
      data: {
        pageId: pageId,
        schema: page.draftSchema as unknown as Prisma.InputJsonValue,
      },
    })

    // Update page to point to the new published version
    await prisma.page.update({
      where: {
        id: pageId,
      },
      data: {
        publishedVersionId: version.id,
      },
    })

    return NextResponse.json({ 
      success: true, 
      versionId: version.id,
      publishedAt: version.publishedAt,
    })
  } catch (error) {
    console.error('Error publishing page:', error)
    return NextResponse.json(
      { error: 'Failed to publish page' },
      { status: 500 }
    )
  }
}

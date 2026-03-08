// API route for individual page operations
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
// GET /api/pages/[pageId] - Get page draft (owner only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { pageId } = await params
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const page = await prisma.page.findFirst({
      where: {
        id: pageId,
        ownerId: session.user.id, // Ensure user isolation
      },
    })

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    return NextResponse.json({ page })
  } catch (error) {
    console.error('Error fetching page:', error)
    return NextResponse.json(
      { error: 'Failed to fetch page' },
      { status: 500 }
    )
  }
}

// PUT /api/pages/[pageId] - Update page draft (owner only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { pageId } = await params
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { draftSchema, title, slug } = body

    // Verify ownership
    const existingPage = await prisma.page.findFirst({
      where: {
        id: pageId,
        ownerId: session.user.id,
      },
    })

    if (!existingPage) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    const page = await prisma.page.update({
      where: {
        id: pageId,
      },
      data: {
        ...(draftSchema && { draftSchema }),
        ...(title && { title }),
        ...(slug !== undefined && { slug }),
      },
    })

    return NextResponse.json({ page })
  } catch (error) {
    console.error('Error updating page:', error)
    return NextResponse.json(
      { error: 'Failed to update page' },
      { status: 500 }
    )
  }
}

// DELETE /api/pages/[pageId] - Delete page (owner only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { pageId } = await params
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership before delete
    const page = await prisma.page.findFirst({
      where: {
        id: pageId,
        ownerId: session.user.id,
      },
    })

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    await prisma.page.delete({
      where: {
        id: pageId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting page:', error)
    return NextResponse.json(
      { error: 'Failed to delete page' },
      { status: 500 }
    )
  }
}

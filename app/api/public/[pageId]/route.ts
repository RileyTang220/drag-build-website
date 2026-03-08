// API route for public page access (no authentication required)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/public/[pageId] - Get published page version
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const { pageId } = await params
    const page = await prisma.page.findUnique({
      where: {
        id: pageId,
      },
      include: {
        publishedVersion: true,
      },
    })

    if (!page || !page.publishedVersion) {
      return NextResponse.json(
        { error: 'Page not found or not published' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      schema: page.publishedVersion.schema,
      meta: {
        title: page.title,
      },
    })
  } catch (error) {
    console.error('Error fetching public page:', error)
    return NextResponse.json(
      { error: 'Failed to fetch page' },
      { status: 500 }
    )
  }
}

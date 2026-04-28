// API route for page CRUD operations
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@/generated/prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PageSchema } from '@/types/schema'
import { apiError, parseJsonBody } from '@/lib/validation/apiError'
import { createPageInput, pageSchemaZ } from '@/lib/validation/pageSchema'
import { cloneTemplateSchema, getTemplate } from '@/lib/templates'
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

// POST /api/pages - Create a new page (optionally from a template)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return apiError('UNAUTHORIZED', 'Sign in required')
    }

    const parsed = await parseJsonBody(request, createPageInput)
    if ('response' in parsed) return parsed.response
    const { title, slug, canvasWidth, canvasHeight, templateId } = parsed.data

    let initialSchema: PageSchema
    let resolvedTitle = title

    if (templateId) {
      const template = getTemplate(templateId)
      if (!template) {
        return apiError('NOT_FOUND', `Template not found: ${templateId}`)
      }
      const cloned = cloneTemplateSchema(templateId)!
      // Re-validate the template through the same Zod we use for user input.
      // Catches drift if the template's schema becomes invalid after a
      // ComponentType / style enum change.
      const validated = pageSchemaZ.safeParse(cloned)
      if (!validated.success) {
        logger.error('[templates] template failed validation', {
          templateId,
          issues: validated.error.issues,
        })
        return apiError('INTERNAL', 'Template is invalid')
      }
      initialSchema = validated.data
      resolvedTitle = title || template.name
    } else {
      const w =
        typeof canvasWidth === 'number' && Number.isFinite(canvasWidth)
          ? Math.round(Math.min(2560, Math.max(320, canvasWidth)))
          : 1200
      const h =
        typeof canvasHeight === 'number' && Number.isFinite(canvasHeight)
          ? Math.round(Math.min(1600, Math.max(240, canvasHeight)))
          : 800
      resolvedTitle = title || 'Untitled Page'
      initialSchema = {
        canvas: { width: w, height: h, background: '#ffffff' },
        nodes: [],
        meta: { title: resolvedTitle },
      }
    }

    const page = await prisma.page.create({
      data: {
        title: resolvedTitle ?? 'Untitled Page',
        slug: slug || undefined,
        ownerId: session.user.id,
        draftSchema: initialSchema as unknown as Prisma.InputJsonValue,
      },
    })

    return NextResponse.json({ page })
  } catch (error) {
    logger.error('POST /api/pages failed', error)
    return apiError('INTERNAL', 'Failed to create page')
  }
}

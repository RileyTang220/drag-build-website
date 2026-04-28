// Delete a single form submission. Owner-only.
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiError, fromZodError } from '@/lib/validation/apiError'
import { pageIdParam } from '@/lib/validation/pageSchema'
import { submissionIdParam } from '@/lib/validation/formSubmission'
import logger from '@/lib/logger'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ pageId: string; submissionId: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return apiError('UNAUTHORIZED', 'Sign in required')

    const { pageId: rawPage, submissionId: rawSub } = await params
    const pageRes = pageIdParam.safeParse(rawPage)
    if (!pageRes.success) return fromZodError(pageRes.error)
    const subRes = submissionIdParam.safeParse(rawSub)
    if (!subRes.success) return fromZodError(subRes.error)

    // Verify owner -> page -> submission chain in a single round trip.
    // findFirst with the joined `page` filter prevents reading or deleting
    // submissions that belong to a page the caller doesn't own.
    const submission = await prisma.formSubmission.findFirst({
      where: {
        id: subRes.data,
        pageId: pageRes.data,
        page: { ownerId: session.user.id },
      },
      select: { id: true },
    })
    if (!submission) return apiError('NOT_FOUND', 'Submission not found')

    await prisma.formSubmission.delete({ where: { id: submission.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('DELETE /api/forms/[pageId]/[submissionId] failed', error)
    return apiError('INTERNAL', 'Failed to delete submission')
  }
}

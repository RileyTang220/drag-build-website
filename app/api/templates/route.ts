// Public template registry endpoint.
//
// Templates are static / non-sensitive, so this route does NOT require auth.
// Listing them publicly lets unauthenticated visitors browse before signing
// up — the actual `Use this template` action is gated by sign-in on the
// downstream POST /api/pages call.
import { NextResponse } from 'next/server'
import { listTemplates } from '@/lib/templates'

export const dynamic = 'force-static' // The list is build-time stable.

export async function GET() {
  return NextResponse.json({ templates: listTemplates() })
}

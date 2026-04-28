/**
 * Helpers for turning Zod failures into structured API responses.
 *
 * All API error bodies follow:
 *   { error: { code, message, issues? } }
 *
 * `issues` is an array of `{ path, message }` so the client can highlight
 * exact fields without parsing free-text.
 */
import { NextResponse } from 'next/server'
import { z, ZodError } from 'zod'

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'INVALID_INPUT'
  | 'PAYLOAD_TOO_LARGE'
  | 'INTERNAL'

interface ApiErrorBody {
  error: {
    code: ApiErrorCode
    message: string
    issues?: Array<{ path: string; message: string }>
  }
}

const STATUS: Record<ApiErrorCode, number> = {
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  INVALID_INPUT: 400,
  PAYLOAD_TOO_LARGE: 413,
  INTERNAL: 500,
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  issues?: ApiErrorBody['error']['issues'],
): NextResponse<ApiErrorBody> {
  return NextResponse.json<ApiErrorBody>(
    { error: { code, message, ...(issues ? { issues } : {}) } },
    { status: STATUS[code] },
  )
}

export function fromZodError(err: ZodError): NextResponse<ApiErrorBody> {
  const issues = err.issues.map((i) => ({
    path: i.path.join('.') || '(root)',
    message: i.message,
  }))
  return apiError('INVALID_INPUT', 'Validation failed', issues)
}

/**
 * Parse JSON request body and validate against a Zod schema.
 * Returns either { data } or a NextResponse error to short-circuit the route.
 */
export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<{ data: T } | { response: NextResponse<ApiErrorBody> }> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return { response: apiError('INVALID_INPUT', 'Invalid JSON body') }
  }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return { response: fromZodError(parsed.error) }
  }
  return { data: parsed.data }
}

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { fromZodError, apiError } from '@/lib/validation/apiError'

describe('apiError', () => {
  it('returns the right HTTP status for each code', async () => {
    const cases = [
      ['UNAUTHORIZED', 401],
      ['NOT_FOUND', 404],
      ['INVALID_INPUT', 400],
      ['PAYLOAD_TOO_LARGE', 413],
      ['INTERNAL', 500],
    ] as const
    for (const [code, status] of cases) {
      const res = apiError(code, 'test')
      expect(res.status).toBe(status)
      const body = await res.json()
      expect(body).toEqual({ error: { code, message: 'test' } })
    }
  })

  it('includes issues when provided', async () => {
    const res = apiError('INVALID_INPUT', 'msg', [
      { path: 'foo', message: 'bad' },
    ])
    const body = await res.json()
    expect(body.error.issues).toEqual([{ path: 'foo', message: 'bad' }])
  })
})

describe('fromZodError', () => {
  it('converts a ZodError into a 400 with structured issues', async () => {
    const schema = z.object({ name: z.string().min(1), age: z.number().int() })
    const r = schema.safeParse({ name: '', age: 1.5 })
    if (r.success) throw new Error('expected validation failure')
    const res = fromZodError(r.error)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('INVALID_INPUT')
    expect(Array.isArray(body.error.issues)).toBe(true)
    // Each issue carries a path joined by dots and a message string.
    for (const issue of body.error.issues) {
      expect(typeof issue.path).toBe('string')
      expect(typeof issue.message).toBe('string')
    }
  })

  it('flattens nested paths into dot-notation', async () => {
    const schema = z.object({
      meta: z.object({ slug: z.string().min(1) }),
    })
    const r = schema.safeParse({ meta: { slug: '' } })
    if (r.success) throw new Error('expected validation failure')
    const body = await fromZodError(r.error).json()
    const slugIssue = body.error.issues.find(
      (i: { path: string }) => i.path === 'meta.slug',
    )
    expect(slugIssue).toBeDefined()
  })

  it('uses "(root)" sentinel when path is empty', async () => {
    const schema = z.string()
    const r = schema.safeParse(123)
    if (r.success) throw new Error('expected validation failure')
    const body = await fromZodError(r.error).json()
    expect(body.error.issues[0].path).toBe('(root)')
  })
})

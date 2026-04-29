import { describe, it, expect } from 'vitest'
import {
  FORM_LIMITS,
  formSubmissionInput,
  listSubmissionsQuery,
  submissionIdParam,
} from '@/lib/validation/formSubmission'

describe('formSubmissionInput', () => {
  it('accepts a small form', () => {
    const r = formSubmissionInput.safeParse({
      fields: { Name: 'Jane', Email: 'jane@example.com', Message: 'Hi' },
    })
    expect(r.success).toBe(true)
  })

  it('rejects empty fields object', () => {
    const r = formSubmissionInput.safeParse({ fields: {} })
    expect(r.success).toBe(false)
  })

  it('rejects more than MAX_FIELDS', () => {
    const fields: Record<string, string> = {}
    for (let i = 0; i <= FORM_LIMITS.MAX_FIELDS; i++) {
      fields[`f${i}`] = 'x'
    }
    expect(formSubmissionInput.safeParse({ fields }).success).toBe(false)
  })

  it('rejects field name with disallowed characters', () => {
    const r = formSubmissionInput.safeParse({
      fields: { 'name<script>': 'x' },
    })
    expect(r.success).toBe(false)
  })

  it('rejects value longer than MAX_VALUE_LEN', () => {
    const r = formSubmissionInput.safeParse({
      fields: { Name: 'x'.repeat(FORM_LIMITS.MAX_VALUE_LEN + 1) },
    })
    expect(r.success).toBe(false)
  })

  it('rejects payload exceeding MAX_PAYLOAD_BYTES', () => {
    // Spread 10 fields of MAX_VALUE_LEN-1 bytes = ~50KB > 10KB.
    const fields: Record<string, string> = {}
    for (let i = 0; i < 10; i++) {
      fields[`f${i}`] = 'x'.repeat(FORM_LIMITS.MAX_VALUE_LEN - 1)
    }
    expect(formSubmissionInput.safeParse({ fields }).success).toBe(false)
  })

  it('rejects unknown top-level keys (strict)', () => {
    const r = formSubmissionInput.safeParse({
      fields: { Name: 'a' },
      evil: true,
    })
    expect(r.success).toBe(false)
  })

  it('accepts allowed name characters: spaces, dot, underscore, dash', () => {
    const r = formSubmissionInput.safeParse({
      fields: { 'First Name': 'A', 'last.name': 'B', a_b: 'C', 'a-b': 'D' },
    })
    expect(r.success).toBe(true)
  })
})

describe('listSubmissionsQuery', () => {
  it('parses string query params via coercion', () => {
    const r = listSubmissionsQuery.safeParse({ limit: '20' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.limit).toBe(20)
  })

  it('clamps to default when limit missing', () => {
    const r = listSubmissionsQuery.safeParse({})
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.limit).toBe(50)
  })

  it('rejects limit out of range', () => {
    expect(listSubmissionsQuery.safeParse({ limit: '0' }).success).toBe(false)
    expect(listSubmissionsQuery.safeParse({ limit: '101' }).success).toBe(false)
  })
})

describe('submissionIdParam', () => {
  it('accepts cuid-like ids', () => {
    expect(submissionIdParam.safeParse('cmoi0cjvp00004fn049tm4c7d').success).toBe(true)
  })

  it('rejects ids with illegal characters', () => {
    expect(submissionIdParam.safeParse('id with space').success).toBe(false)
    expect(submissionIdParam.safeParse('id/slash').success).toBe(false)
    expect(submissionIdParam.safeParse('').success).toBe(false)
  })
})

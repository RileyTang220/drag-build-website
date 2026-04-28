/**
 * Validation for form submissions captured from published pages.
 *
 * Schema is intentionally generous (any field name → string value) because
 * the page builder lets owners design arbitrary forms. We constrain by
 * SHAPE limits, not by required fields:
 *   - max 50 fields per submission
 *   - max 64-char field name
 *   - max 5,000-char field value
 *   - max ~10KB serialized payload
 *
 * Empty submissions are rejected so a misbehaving bot that POSTs `{}`
 * doesn't generate noise.
 */
import { z } from 'zod'

export const FORM_LIMITS = {
  MAX_FIELDS: 50,
  MAX_NAME_LEN: 64,
  MAX_VALUE_LEN: 5_000,
  MAX_PAYLOAD_BYTES: 10_000,
  /** Per-IP rate limit: max submissions to ANY page in this window. */
  RATE_WINDOW_SECONDS: 60,
  RATE_MAX_REQUESTS: 5,
} as const

const fieldName = z
  .string()
  .min(1)
  .max(FORM_LIMITS.MAX_NAME_LEN)
  // Field names live in JSONB and may surface in CSV exports — keep the
  // character set narrow to avoid surprise quoting / XSS in downstream
  // tooling. Allow letters, digits, spaces, dash, underscore, dot.
  .regex(/^[a-zA-Z0-9 ._-]+$/, 'Invalid field name')

const fieldValue = z.string().max(FORM_LIMITS.MAX_VALUE_LEN)

export const formSubmissionInput = z
  .object({
    fields: z
      .record(fieldName, fieldValue)
      .refine((obj) => Object.keys(obj).length > 0, 'Empty submission')
      .refine(
        (obj) => Object.keys(obj).length <= FORM_LIMITS.MAX_FIELDS,
        `At most ${FORM_LIMITS.MAX_FIELDS} fields`,
      ),
  })
  .strict()
  .superRefine((value, ctx) => {
    const bytes = Buffer.byteLength(JSON.stringify(value), 'utf8')
    if (bytes > FORM_LIMITS.MAX_PAYLOAD_BYTES) {
      ctx.addIssue({
        code: 'custom',
        message: `Payload too large (${bytes} > ${FORM_LIMITS.MAX_PAYLOAD_BYTES})`,
      })
    }
  })

export type FormSubmissionInput = z.infer<typeof formSubmissionInput>

// Listing query (?limit=20&cursor=...)
export const listSubmissionsQuery = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    cursor: z.string().max(64).optional(),
  })
  .strict()

export const submissionIdParam = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid submissionId')

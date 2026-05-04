/**
 * Zod schemas for the AI generation endpoint.
 *
 * Constraints are tighter than form submission because every accepted
 * request becomes an LLM call — i.e. real money + real latency. Reject
 * anything outside spec at the edge instead of paying to call Anthropic.
 */
import { z } from 'zod'

export const AI_LIMITS = {
  MIN_PROMPT_LEN: 10,
  MAX_PROMPT_LEN: 1_000,
  /** Per-user request budget in the rolling window below. */
  RATE_MAX_PER_WINDOW: 10,
  RATE_WINDOW_MS: 60 * 60 * 1000, // 1 hour
} as const

export const aiGenerateInput = z
  .object({
    prompt: z
      .string()
      .min(AI_LIMITS.MIN_PROMPT_LEN, 'Prompt is too short')
      .max(AI_LIMITS.MAX_PROMPT_LEN, 'Prompt is too long'),
  })
  .strict()

export type AiGenerateInput = z.infer<typeof aiGenerateInput>

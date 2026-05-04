/**
 * Server-side AI page generation, powered by DeepSeek's OpenAI-compatible
 * Chat Completions API.
 *
 * Why the OpenAI SDK against a non-OpenAI host: DeepSeek explicitly
 * implements the same wire protocol (paths, body shape, tool calling
 * grammar) as OpenAI. Pointing the official `openai` SDK at
 * `https://api.deepseek.com/v1` gives us all the streaming + tool
 * semantics for free, with a swap-by-config-only path back to OpenAI
 * (or any other compatible vendor) later.
 *
 * Pipeline:
 *   user prompt → DeepSeek chat.completions.create with the `create_page`
 *   tool → streamed chunks accumulate the tool's argument JSON →
 *   JSON.parse → pageSchemaZ.safeParse → PageSchema.
 *
 * Same Zod the editor uses for hand-edited pages — drift between model
 * output and runtime renderer is caught BEFORE we write to the DB.
 */
import OpenAI from 'openai'
import { pageSchemaZ } from '@/lib/validation/pageSchema'
import type { PageSchema } from '@/types/schema'
import logger from '@/lib/logger'

const MODEL = 'deepseek-chat' // V3 chat — fast + cheap. Use deepseek-reasoner for harder briefs.
const BASE_URL = 'https://api.deepseek.com/v1'
// DeepSeek-chat caps single-completion output at 8192 tokens. We push to
// the ceiling because JSON is verbose (~3 chars / token) and a 30-node
// schema can easily run 4–6k tokens. If we ever migrate to a longer-output
// model (deepseek-reasoner, gpt-4o-mini, etc.), bump this.
const MAX_TOKENS = 8192
const MAX_NODES = 30

const SYSTEM_PROMPT = `You design responsive web pages. Given a brief, output a complete page schema by calling the create_page function.

# Canvas
- Always 1200px wide. Height grows with content; pick a value between 1600 and 3000.
- Coordinates in pixels, origin (0, 0) top-left, Y grows downward.
- Use absolute positioning. Leave at least 24px between vertically adjacent sections.
- Background often white (#ffffff) — set canvas.background.

# Component types and conventions

## Heading — props: { content, level (1-6) }
- level 1: fontSize 48–64, fontWeight 800, hero only
- level 2: fontSize 32–40, fontWeight 700, section titles
- level 3: fontSize 20–24, fontWeight 700, card titles

## Text — props: { content }
- body fontSize 14–18, color #475569 (slate-600) for muted text

## Image — props: { src, alt }
- ALWAYS use placehold.co URLs:
  https://placehold.co/{W}x{H}/{bgHex}/{fgHex}?text={URLEncodedLabel}
  e.g. https://placehold.co/600x400/2b579a/ffffff?text=Hero
- The bg/fg should harmonize with the page's accent color.

## Button — props: { label, href, action ("link" | "submit") }
- Width 140–220, height 44–52, borderRadius 6–8.
- Primary CTA: action "link" (href "#") with bg = accent color, color "#ffffff".
- Form submit: action "submit". Use this for the button at the bottom of any input group.

## Container — props: {} — colored card / section background
- backgroundColor + borderRadius 8–16. Use to group related content.

## Divider — props: {} — horizontal line
- height 1, full-width, backgroundColor "#e2e8f0".

## Input — props: { label, placeholder, type ("text"|"email"|"tel"|"url"|"number") }
- height 70 (label + field). Width 380–500.

## Map — props: { address }
- Real street address. Width 480–560, height 280–340.

# Style fields — STRICT CLOSED SET
The ONLY allowed style keys are: position, left, top, width, height, rotate,
zIndex, fontSize, fontWeight, color, backgroundColor, borderColor, borderWidth,
borderStyle, borderRadius, padding, margin, textAlign.
- position: "absolute" (always)
- left, top, width, height, rotate, zIndex: numbers
- fontSize, borderWidth, borderRadius, padding, margin: numbers (px)
- fontWeight: 400 | 500 | 600 | 700 | 800
- textAlign: "left" | "center" | "right"
- borderStyle: "solid" | "dashed" | "dotted"
- color, backgroundColor, borderColor: hex strings like "#0f172a"

DO NOT use any other CSS property — opacity, transform, transition, animation,
boxShadow, display, gap, flex, grid, lineHeight, letterSpacing, etc. will be
DROPPED. If you need visual effect like emphasis, use color/fontWeight/size only.

# Layout principles
- Hero at top: big Heading + supporting Text + 1–2 Buttons + optional Image.
- Sections: each starts with a centered Heading and may include 2–4 Container cards.
- Always include a Footer Container with copyright Text.
- Use a small accent palette: 1 brand color + neutral grays. Be consistent.
- DO NOT overlap nodes unless one is intentionally over an Image (e.g., hero text over hero bg).
- Each node MUST have a unique \`id\` like "node-1", "node-2"...
- Output AT MOST ${MAX_NODES} nodes; pick the most impactful ones for the brief.
- KEEP TEXT CONCISE: Heading content ≤ 8 words, Text content ≤ 25 words. Avoid
  long paragraphs. Total JSON output should fit comfortably under 8000 tokens.
- Omit OPTIONAL style fields when default behavior is fine — every extra
  field eats output budget. Only set what actually changes the design.

# Output
Call the create_page function with { title, canvas, nodes }. Do not write any prose — only the function call.`

const componentTypes = [
  'Text',
  'Heading',
  'Image',
  'Button',
  'Container',
  'Divider',
  'Input',
  'Map',
] as const

const createPageTool: OpenAI.Chat.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'create_page',
    description: 'Generate a complete page schema',
    parameters: {
      type: 'object',
      required: ['canvas', 'nodes'],
      properties: {
        title: { type: 'string', maxLength: 200 },
        canvas: {
          type: 'object',
          required: ['width', 'height'],
          properties: {
            width: { type: 'integer', minimum: 320, maximum: 4096 },
            height: { type: 'integer', minimum: 240, maximum: 4096 },
            background: { type: 'string', maxLength: 64 },
          },
        },
        nodes: {
          type: 'array',
          maxItems: MAX_NODES,
          items: {
            type: 'object',
            required: ['id', 'type', 'props', 'style'],
            properties: {
              id: { type: 'string', maxLength: 64 },
              type: { type: 'string', enum: [...componentTypes] },
              props: { type: 'object', additionalProperties: true },
              style: {
                type: 'object',
                required: ['position', 'left', 'top'],
                properties: {
                  position: { const: 'absolute' },
                  left: { type: 'number' },
                  top: { type: 'number' },
                  width: { type: 'number' },
                  height: { type: 'number' },
                  fontSize: { type: 'number' },
                  color: { type: 'string' },
                  backgroundColor: { type: 'string' },
                  borderColor: { type: 'string' },
                  borderWidth: { type: 'number' },
                  borderRadius: { type: 'number' },
                  padding: { type: 'number' },
                  margin: { type: 'number' },
                  textAlign: { type: 'string', enum: ['left', 'center', 'right'] },
                  fontWeight: { type: ['number', 'string'] },
                },
              },
            },
          },
        },
      },
    },
  },
}

// ─── Output sanitization ──────────────────────────────────────────────────────
// LLMs occasionally invent style keys not in our schema (`opacity`,
// `boxShadow`, `transform`, etc.). Rather than rejecting the whole
// generation, we silently drop unknown keys before Zod sees the candidate.
// Anything still missing required keys (left/top/position) will be caught
// downstream — we only strip extras.

const ALLOWED_STYLE_KEYS: ReadonlySet<string> = new Set([
  'position',
  'left',
  'top',
  'width',
  'height',
  'rotate',
  'zIndex',
  'fontSize',
  'color',
  'backgroundColor',
  'borderColor',
  'borderWidth',
  'borderStyle',
  'borderRadius',
  'padding',
  'margin',
  'textAlign',
  'fontWeight',
])

function sanitizeStyle(style: unknown): Record<string, unknown> {
  if (!style || typeof style !== 'object') return {}
  const out: Record<string, unknown> = {}
  let dropped = 0
  for (const [k, v] of Object.entries(style as Record<string, unknown>)) {
    if (ALLOWED_STYLE_KEYS.has(k)) {
      out[k] = v
    } else {
      dropped++
    }
  }
  if (dropped > 0) {
    logger.warn('[ai] dropped unknown style keys', { count: dropped })
  }
  return out
}

interface RawNode {
  id?: unknown
  type?: unknown
  props?: unknown
  style?: unknown
  children?: unknown
}

function sanitizeNode(node: unknown): unknown {
  if (!node || typeof node !== 'object') return node
  const n = node as RawNode
  return {
    ...n,
    style: sanitizeStyle(n.style),
    children: Array.isArray(n.children) ? n.children.map(sanitizeNode) : undefined,
  }
}

function sanitizeAiOutput(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    ...raw,
    nodes: Array.isArray(raw.nodes) ? raw.nodes.map(sanitizeNode) : raw.nodes,
  }
}

// ─── Public types ────────────────────────────────────────────────────────────

export interface GenerateOptions {
  prompt: string
}

export type GenerationPhase = 'connecting' | 'generating' | 'validating'

export interface StreamGenerateOptions extends GenerateOptions {
  onPhase?: (phase: GenerationPhase) => void
  onProgress?: (charsAccumulated: number) => void
  /** Aborts the upstream HTTP call when the API route's client disconnects. */
  signal?: AbortSignal
}

export interface GenerateResult {
  schema: PageSchema
  title: string
  /** finish_reason from the underlying chat completion. */
  stopReason: string
}

let cachedClient: OpenAI | null = null
function getClient(): OpenAI {
  if (cachedClient) return cachedClient
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not configured')
  }
  cachedClient = new OpenAI({ apiKey, baseURL: BASE_URL })
  return cachedClient
}

export async function streamGeneratePage(
  opts: StreamGenerateOptions,
): Promise<GenerateResult> {
  const client = getClient()

  opts.onPhase?.('connecting')

  const stream = await client.chat.completions.create(
    {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: opts.prompt },
      ],
      tools: [createPageTool],
      // Force the model to call our tool — no free-form prose allowed.
      tool_choice: { type: 'function', function: { name: 'create_page' } },
      stream: true,
    },
    opts.signal ? { signal: opts.signal } : undefined,
  )

  opts.onPhase?.('generating')

  // OpenAI-style streaming returns chat completion *chunks*. The tool
  // call's JSON body arrives in `choices[0].delta.tool_calls[0].function
  // .arguments` as string fragments which we concatenate. DeepSeek may
  // return larger fragments than OpenAI does — same code path either way.
  let argsText = ''
  let finishReason = 'stop'
  for await (const chunk of stream) {
    const choice = chunk.choices[0]
    if (!choice) continue
    const fragment = choice.delta?.tool_calls?.[0]?.function?.arguments
    if (typeof fragment === 'string' && fragment.length > 0) {
      argsText += fragment
      opts.onProgress?.(argsText.length)
    }
    if (choice.finish_reason) finishReason = choice.finish_reason
  }

  opts.onPhase?.('validating')

  if (!argsText) {
    logger.error('[ai] empty tool arguments', { finishReason })
    throw new Error('Model did not return a page schema')
  }

  // Token cap hit mid-JSON → output is truncated, can't possibly parse.
  // Surface this distinctly so the user sees "the brief asked for too
  // much; simplify it" instead of the generic "invalid JSON".
  if (finishReason === 'length') {
    logger.error('[ai] hit max_tokens — output truncated', {
      length: argsText.length,
    })
    throw new Error(
      'Generated schema is invalid: response was too long and got truncated. Try a simpler brief or fewer sections.',
    )
  }

  let raw: Record<string, unknown>
  try {
    raw = JSON.parse(argsText) as Record<string, unknown>
  } catch (err) {
    logger.error('[ai] failed to parse tool arguments', {
      preview: argsText.slice(0, 500),
      length: argsText.length,
      finishReason,
      error: err instanceof Error ? err.message : String(err),
    })
    throw new Error('Generated schema is invalid: tool output is not valid JSON')
  }

  const title = typeof raw.title === 'string' ? raw.title : 'Untitled AI Page'

  // Strip unknown style keys (`opacity`, `transform`, etc.) the LLM
  // sometimes invents. Keeps Zod's `.strict()` honest while not aborting
  // the whole generation over a single hallucinated CSS property.
  const sanitized = sanitizeAiOutput(raw)

  const candidate = {
    canvas: sanitized.canvas,
    nodes: sanitized.nodes,
    meta: { title },
  }
  const parsed = pageSchemaZ.safeParse(candidate)
  if (!parsed.success) {
    logger.error('[ai] generated schema failed Zod', {
      issues: parsed.error.issues.slice(0, 5),
      preview: JSON.stringify(candidate).slice(0, 500),
    })
    throw new Error(
      `Generated schema is invalid: ${parsed.error.issues[0]?.message ?? 'unknown'}`,
    )
  }

  return {
    schema: parsed.data,
    title,
    stopReason: finishReason,
  }
}

export async function generatePage(opts: GenerateOptions): Promise<GenerateResult> {
  return streamGeneratePage(opts)
}

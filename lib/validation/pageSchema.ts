/**
 * Zod schemas for validating page data at the API boundary.
 *
 * Two layers of safety:
 *  1. Shape & type — every field is type-checked, unknown keys stripped.
 *  2. Limits — node count, schema byte size, dimensions, string length.
 *
 * These limits are intentionally generous for normal use but tight enough
 * to prevent abuse (huge payloads, infinite trees, oversized JSONB rows).
 */
import { z } from 'zod'
import { COMPONENT_TYPES, type ComponentType } from '@/types/schema'

// ─── Limits ────────────────────────────────────────────────────────────────────

export const LIMITS = {
  /** Max number of nodes in a single page schema (flat + nested combined). */
  MAX_NODES: 500,
  /** Max serialized schema size in bytes (~1MB). */
  MAX_SCHEMA_BYTES: 1_000_000,
  /** Max nesting depth for Container children. */
  MAX_NODE_DEPTH: 8,
  /** Canvas dimension bounds (px). */
  MIN_CANVAS_DIM: 240,
  MAX_CANVAS_DIM: 4096,
  /** Per-node coordinate bounds (px). Generous to allow off-canvas during drag. */
  MAX_COORD: 10_000,
  /** Per-string length limits. */
  MAX_TITLE_LEN: 200,
  MAX_TEXT_CONTENT: 5_000,
  MAX_URL_LEN: 2_048,
} as const

// ─── Primitives ────────────────────────────────────────────────────────────────

// Single source of truth: types/schema.ts COMPONENT_TYPES.
// Adding a new component there automatically opens it for the API.
const componentTypeSchema = z.enum(COMPONENT_TYPES)

const colorSchema = z
  .string()
  .max(64)
  .regex(
    /^(#[0-9a-fA-F]{3,8}|rgb\(.*\)|rgba\(.*\)|hsl\(.*\)|hsla\(.*\)|[a-zA-Z]+|transparent)$/,
    'Invalid color',
  )
  .optional()

const componentStyleSchema = z
  .object({
    position: z.literal('absolute'),
    left: z.number().finite().min(-LIMITS.MAX_COORD).max(LIMITS.MAX_COORD),
    top: z.number().finite().min(-LIMITS.MAX_COORD).max(LIMITS.MAX_COORD),
    width: z.number().finite().min(0).max(LIMITS.MAX_COORD).optional(),
    height: z.number().finite().min(0).max(LIMITS.MAX_COORD).optional(),
    rotate: z.number().finite().min(-360).max(360).optional(),
    zIndex: z.number().int().min(-1000).max(1000).optional(),
    fontSize: z.number().finite().min(1).max(512).optional(),
    color: colorSchema,
    backgroundColor: colorSchema,
    borderColor: colorSchema,
    borderWidth: z.number().finite().min(0).max(64).optional(),
    borderStyle: z.enum(['solid', 'dashed', 'dotted']).optional(),
    borderRadius: z.number().finite().min(0).max(512).optional(),
    padding: z.number().finite().min(0).max(512).optional(),
    margin: z.number().finite().min(0).max(512).optional(),
    textAlign: z.enum(['left', 'center', 'right']).optional(),
    fontWeight: z.union([z.string().max(20), z.number().int().min(1).max(1000)]).optional(),
  })
  .strict()

// Breakpoint overrides: same fields as base but every one is optional, plus
// `position` is dropped (always 'absolute'; allowing it in overrides would
// invite layout chaos).
const componentStyleOverrideSchema = z
  .object({
    left: z.number().finite().min(-LIMITS.MAX_COORD).max(LIMITS.MAX_COORD).optional(),
    top: z.number().finite().min(-LIMITS.MAX_COORD).max(LIMITS.MAX_COORD).optional(),
    width: z.number().finite().min(0).max(LIMITS.MAX_COORD).optional(),
    height: z.number().finite().min(0).max(LIMITS.MAX_COORD).optional(),
    rotate: z.number().finite().min(-360).max(360).optional(),
    zIndex: z.number().int().min(-1000).max(1000).optional(),
    fontSize: z.number().finite().min(1).max(512).optional(),
    color: colorSchema,
    backgroundColor: colorSchema,
    borderColor: colorSchema,
    borderWidth: z.number().finite().min(0).max(64).optional(),
    borderStyle: z.enum(['solid', 'dashed', 'dotted']).optional(),
    borderRadius: z.number().finite().min(0).max(512).optional(),
    padding: z.number().finite().min(0).max(512).optional(),
    margin: z.number().finite().min(0).max(512).optional(),
    textAlign: z.enum(['left', 'center', 'right']).optional(),
    fontWeight: z.union([z.string().max(20), z.number().int().min(1).max(1000)]).optional(),
  })
  .strict()

const styleOverridesSchema = z
  .object({
    tablet: componentStyleOverrideSchema.optional(),
    mobile: componentStyleOverrideSchema.optional(),
  })
  .strict()

// ─── Recursive node schema ─────────────────────────────────────────────────────
// Zod recursive types use z.lazy + a typed alias.
//
// We deliberately keep `props` as a record of unknowns at this layer: each
// component renderer is responsible for its own prop validation, and the
// runtime renderer further sanitizes via a property whitelist + URL sanitizer.
// This keeps the API generic while the runtime stays safe.

export interface ComponentNodeInput {
  id: string
  type: ComponentType
  props: Record<string, unknown>
  style: z.infer<typeof componentStyleSchema>
  styleOverrides?: z.infer<typeof styleOverridesSchema>
  children?: ComponentNodeInput[]
}

const idSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_\-:.]+$/, 'Invalid node id')

const propsSchema = z.record(z.string(), z.unknown())

export const componentNodeSchema: z.ZodType<ComponentNodeInput> = z.lazy(() =>
  z
    .object({
      id: idSchema,
      type: componentTypeSchema,
      props: propsSchema,
      style: componentStyleSchema,
      styleOverrides: styleOverridesSchema.optional(),
      children: z.array(componentNodeSchema).optional(),
    })
    .strict(),
)

// ─── Page schema ───────────────────────────────────────────────────────────────

export const pageSchemaZ = z
  .object({
    canvas: z
      .object({
        width: z.number().int().min(LIMITS.MIN_CANVAS_DIM).max(LIMITS.MAX_CANVAS_DIM),
        height: z.number().int().min(LIMITS.MIN_CANVAS_DIM).max(LIMITS.MAX_CANVAS_DIM),
        background: colorSchema,
      })
      .strict(),
    nodes: z.array(componentNodeSchema),
    meta: z
      .object({
        title: z.string().max(LIMITS.MAX_TITLE_LEN).optional(),
        description: z.string().max(1000).optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((schema, ctx) => {
    // Total node count (flatten Containers)
    const total = countNodes(schema.nodes)
    if (total > LIMITS.MAX_NODES) {
      ctx.addIssue({
        code: 'custom',
        message: `Too many nodes: ${total} > ${LIMITS.MAX_NODES}`,
        path: ['nodes'],
      })
    }

    // Max nesting depth
    const depth = maxDepth(schema.nodes)
    if (depth > LIMITS.MAX_NODE_DEPTH) {
      ctx.addIssue({
        code: 'custom',
        message: `Tree too deep: ${depth} > ${LIMITS.MAX_NODE_DEPTH}`,
        path: ['nodes'],
      })
    }

    // Unique ids across the whole tree
    const seen = new Set<string>()
    if (!hasUniqueIds(schema.nodes, seen)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Duplicate node ids',
        path: ['nodes'],
      })
    }

    // Total serialized byte size (rough but fast)
    const bytes = byteSize(schema)
    if (bytes > LIMITS.MAX_SCHEMA_BYTES) {
      ctx.addIssue({
        code: 'custom',
        message: `Schema too large: ${bytes} bytes > ${LIMITS.MAX_SCHEMA_BYTES}`,
        path: [],
      })
    }
  })

export type PageSchemaParsed = z.infer<typeof pageSchemaZ>

// ─── Endpoint inputs ───────────────────────────────────────────────────────────

export const createPageInput = z
  .object({
    title: z.string().min(1).max(LIMITS.MAX_TITLE_LEN).optional(),
    slug: z
      .string()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, 'Invalid slug')
      .optional(),
    canvasWidth: z.number().finite().optional(),
    canvasHeight: z.number().finite().optional(),
    /** Optional template id; omitted = blank page. */
    templateId: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[a-z0-9-]+$/, 'Invalid templateId')
      .optional(),
  })
  .strict()

export const updatePageInput = z
  .object({
    draftSchema: pageSchemaZ.optional(),
    title: z.string().min(1).max(LIMITS.MAX_TITLE_LEN).optional(),
    slug: z
      .string()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, 'Invalid slug')
      .optional()
      .or(z.literal('')),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'Empty update' })

export const pageIdParam = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid pageId')

// ─── Helpers ───────────────────────────────────────────────────────────────────

function countNodes(nodes: ComponentNodeInput[]): number {
  let n = 0
  for (const node of nodes) {
    n += 1
    if (node.children?.length) n += countNodes(node.children)
  }
  return n
}

function maxDepth(nodes: ComponentNodeInput[], depth = 1): number {
  let m = depth
  for (const node of nodes) {
    if (node.children?.length) {
      m = Math.max(m, maxDepth(node.children, depth + 1))
    }
  }
  return m
}

function hasUniqueIds(nodes: ComponentNodeInput[], seen: Set<string>): boolean {
  for (const node of nodes) {
    if (seen.has(node.id)) return false
    seen.add(node.id)
    if (node.children?.length && !hasUniqueIds(node.children, seen)) return false
  }
  return true
}

function byteSize(value: unknown): number {
  // Byte length of UTF-8 encoded JSON. Cheap and accurate enough for a guard.
  return Buffer.byteLength(JSON.stringify(value), 'utf8')
}

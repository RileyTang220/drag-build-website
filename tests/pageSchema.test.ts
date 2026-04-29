import { describe, it, expect } from 'vitest'
import {
  LIMITS,
  componentNodeSchema,
  createPageInput,
  pageIdParam,
  pageSchemaZ,
  updatePageInput,
} from '@/lib/validation/pageSchema'

const validNode = (overrides: Record<string, unknown> = {}) => ({
  id: 'node-1',
  type: 'Text',
  props: { content: 'hello' },
  style: { position: 'absolute', left: 0, top: 0, width: 100, height: 30 },
  ...overrides,
})

const validPage = (overrides: Record<string, unknown> = {}) => ({
  canvas: { width: 800, height: 600, background: '#ffffff' },
  nodes: [validNode()],
  meta: { title: 'Test' },
  ...overrides,
})

describe('componentNodeSchema', () => {
  it('accepts a minimal valid node', () => {
    expect(componentNodeSchema.safeParse(validNode()).success).toBe(true)
  })

  it('rejects unknown component type', () => {
    const r = componentNodeSchema.safeParse(validNode({ type: 'Unknown' }))
    expect(r.success).toBe(false)
  })

  it('rejects node without absolute position', () => {
    const r = componentNodeSchema.safeParse(
      validNode({ style: { position: 'relative', left: 0, top: 0 } }),
    )
    expect(r.success).toBe(false)
  })

  it('rejects unknown style key (strict)', () => {
    const r = componentNodeSchema.safeParse(
      validNode({ style: { position: 'absolute', left: 0, top: 0, evil: 'x' } }),
    )
    expect(r.success).toBe(false)
  })

  it('rejects invalid id characters', () => {
    const r = componentNodeSchema.safeParse(validNode({ id: 'has spaces' }))
    expect(r.success).toBe(false)
  })

  it('accepts nested children', () => {
    const r = componentNodeSchema.safeParse({
      ...validNode({ id: 'parent', type: 'Container' }),
      children: [validNode({ id: 'child' })],
    })
    expect(r.success).toBe(true)
  })
})

describe('pageSchemaZ', () => {
  it('accepts a minimal valid page', () => {
    expect(pageSchemaZ.safeParse(validPage()).success).toBe(true)
  })

  it('rejects canvas smaller than minimum', () => {
    const r = pageSchemaZ.safeParse(
      validPage({ canvas: { width: 10, height: 10 } }),
    )
    expect(r.success).toBe(false)
  })

  it('rejects too many nodes', () => {
    const tooMany = Array.from({ length: LIMITS.MAX_NODES + 1 }, (_, i) =>
      validNode({ id: `node-${i}` }),
    )
    const r = pageSchemaZ.safeParse(validPage({ nodes: tooMany }))
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues.some((i) => /Too many nodes/.test(i.message))).toBe(
        true,
      )
    }
  })

  it('rejects duplicate node ids', () => {
    const r = pageSchemaZ.safeParse(
      validPage({
        nodes: [validNode({ id: 'dup' }), validNode({ id: 'dup' })],
      }),
    )
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues.some((i) => /Duplicate node ids/.test(i.message))).toBe(
        true,
      )
    }
  })

  it('rejects nesting deeper than MAX_NODE_DEPTH', () => {
    // Build a single chain N deep.
    const buildChain = (n: number): Record<string, unknown> => ({
      id: `n-${n}`,
      type: 'Container',
      props: {},
      style: { position: 'absolute', left: 0, top: 0 },
      children: n > 0 ? [buildChain(n - 1)] : undefined,
    })
    const tooDeep = buildChain(LIMITS.MAX_NODE_DEPTH + 1)
    const r = pageSchemaZ.safeParse(validPage({ nodes: [tooDeep] }))
    expect(r.success).toBe(false)
  })

  it('rejects schema exceeding MAX_SCHEMA_BYTES', () => {
    const huge = validNode({
      id: 'node-1',
      props: { content: 'x'.repeat(LIMITS.MAX_SCHEMA_BYTES) },
    })
    const r = pageSchemaZ.safeParse(validPage({ nodes: [huge] }))
    expect(r.success).toBe(false)
  })

  it('rejects extra top-level keys (strict)', () => {
    const r = pageSchemaZ.safeParse({ ...validPage(), evil: true })
    expect(r.success).toBe(false)
  })
})

describe('createPageInput', () => {
  it('accepts an empty body (all fields optional)', () => {
    expect(createPageInput.safeParse({}).success).toBe(true)
  })

  it('accepts a templateId of valid form', () => {
    expect(
      createPageInput.safeParse({ templateId: 'business' }).success,
    ).toBe(true)
  })

  it('rejects malformed templateId', () => {
    expect(
      createPageInput.safeParse({ templateId: 'with spaces' }).success,
    ).toBe(false)
  })

  it('rejects malformed slug', () => {
    expect(createPageInput.safeParse({ slug: '-bad' }).success).toBe(false)
    expect(createPageInput.safeParse({ slug: 'BAD' }).success).toBe(false)
    expect(createPageInput.safeParse({ slug: 'good-slug' }).success).toBe(true)
  })
})

describe('updatePageInput', () => {
  it('rejects an empty body (must update at least one field)', () => {
    expect(updatePageInput.safeParse({}).success).toBe(false)
  })

  it('accepts only title', () => {
    expect(updatePageInput.safeParse({ title: 'New' }).success).toBe(true)
  })

  it('accepts a draftSchema field', () => {
    expect(
      updatePageInput.safeParse({ draftSchema: validPage() }).success,
    ).toBe(true)
  })

  it('passes empty-string slug through (means clear slug)', () => {
    expect(updatePageInput.safeParse({ slug: '' }).success).toBe(true)
  })
})

describe('pageIdParam', () => {
  it.each(['abc', 'cuid_id-1', '01H8XYZ', 'a-_b'])(
    'accepts valid id %s',
    (id) => {
      expect(pageIdParam.safeParse(id).success).toBe(true)
    },
  )

  it.each(['', '   ', 'with space', 'evil/path', 'a'.repeat(200)])(
    'rejects invalid id %s',
    (id) => {
      expect(pageIdParam.safeParse(id).success).toBe(false)
    },
  )
})

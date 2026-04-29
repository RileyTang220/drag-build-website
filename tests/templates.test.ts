import { describe, it, expect } from 'vitest'
import {
  cloneTemplateSchema,
  getTemplate,
  listTemplates,
} from '@/lib/templates'
import { businessTemplate } from '@/lib/templates/business'
import { restaurantTemplate } from '@/lib/templates/restaurant'
import { pageSchemaZ } from '@/lib/validation/pageSchema'

describe('templates pass pageSchemaZ', () => {
  it.each([
    ['business', businessTemplate],
    ['restaurant', restaurantTemplate],
  ])('%s', (_name, tpl) => {
    const r = pageSchemaZ.safeParse(tpl.schema)
    if (!r.success) {
      // Surface first issue when failing — much easier to debug than a
      // bare `expect(false).toBe(true)`.
      console.error(r.error.issues)
    }
    expect(r.success).toBe(true)
  })

  it('all templates have unique ids', () => {
    const list = listTemplates()
    expect(new Set(list.map((t) => t.id)).size).toBe(list.length)
  })

  it('every node id inside a template is unique', () => {
    for (const tpl of [businessTemplate, restaurantTemplate]) {
      const ids = new Set<string>()
      const walk = (nodes: typeof tpl.schema.nodes) => {
        for (const n of nodes) {
          expect(ids.has(n.id), `dup id ${n.id} in ${tpl.id}`).toBe(false)
          ids.add(n.id)
          if (n.children) walk(n.children)
        }
      }
      walk(tpl.schema.nodes)
    }
  })
})

describe('template registry', () => {
  it('listTemplates returns metadata only (no schema)', () => {
    const list = listTemplates()
    for (const t of list) {
      expect(t).not.toHaveProperty('schema')
      expect(t).toHaveProperty('thumbnailSvg')
    }
  })

  it('getTemplate returns null for unknown id', () => {
    expect(getTemplate('does-not-exist')).toBeNull()
  })

  it('cloneTemplateSchema deep-clones (mutating clone leaves source intact)', () => {
    const cloned = cloneTemplateSchema('business')
    expect(cloned).not.toBeNull()
    if (!cloned) return
    cloned.nodes[0].id = 'mutated-id'
    expect(businessTemplate.schema.nodes[0].id).not.toBe('mutated-id')
  })
})

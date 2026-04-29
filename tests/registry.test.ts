import { describe, it, expect } from 'vitest'
import {
  PALETTE_ORDER,
  componentRegistry,
  createNode,
  getDefaultProps,
  getDefaultStyle,
} from '@/components/registry'
import { COMPONENT_TYPES } from '@/types/schema'

describe('componentRegistry', () => {
  it('has an entry for every COMPONENT_TYPES value', () => {
    for (const t of COMPONENT_TYPES) {
      expect(componentRegistry[t]).toBeDefined()
      expect(typeof componentRegistry[t].label).toBe('string')
      expect(typeof componentRegistry[t].icon).toBe('string')
    }
  })

  it('palette order is a subset of COMPONENT_TYPES with no duplicates', () => {
    expect(PALETTE_ORDER.every((t) => COMPONENT_TYPES.includes(t))).toBe(true)
    expect(new Set(PALETTE_ORDER).size).toBe(PALETTE_ORDER.length)
  })

  it('getDefaultProps returns a fresh object each call (no shared refs)', () => {
    const a = getDefaultProps('Text')
    const b = getDefaultProps('Text')
    a.content = 'mutated'
    expect(b.content).not.toBe('mutated')
  })

  it('getDefaultStyle returns a fresh object each call', () => {
    const a = getDefaultStyle('Image')
    const b = getDefaultStyle('Image')
    a.width = 9999
    expect(b.width).not.toBe(9999)
  })
})

describe('createNode', () => {
  it('produces a node with absolute positioning at the given point', () => {
    const node = createNode('Heading', { left: 120, top: 80 }, 'test-1')
    expect(node).toMatchObject({
      id: 'node-test-1',
      type: 'Heading',
      style: {
        position: 'absolute',
        left: 120,
        top: 80,
      },
    })
  })

  it('merges registry defaults into style', () => {
    const node = createNode('Button', { left: 0, top: 0 }, 'btn')
    expect(node.style.width).toBe(componentRegistry.Button.defaultStyle.width)
    expect(node.style.backgroundColor).toBe(
      componentRegistry.Button.defaultStyle.backgroundColor,
    )
  })

  it('copies default props rather than sharing the registry reference', () => {
    const node = createNode('Text', { left: 0, top: 0 }, 'a')
    node.props.content = 'changed'
    const reread = getDefaultProps('Text')
    expect(reread.content).not.toBe('changed')
  })
})

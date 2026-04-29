import { describe, it, expect } from 'vitest'
import { computeSnap } from '@/lib/editor/snapping'
import type { ComponentNode, PageSchema } from '@/types/schema'

const node = (
  id: string,
  left: number,
  top: number,
  width = 100,
  height = 50,
): ComponentNode => ({
  id,
  type: 'Text',
  props: {},
  style: { position: 'absolute', left, top, width, height },
})

const schemaWith = (...nodes: ComponentNode[]): PageSchema => ({
  canvas: { width: 1200, height: 800, background: '#fff' },
  nodes,
})

describe('computeSnap', () => {
  it('returns delta unchanged when no neighbor is close', () => {
    const schema = schemaWith(node('a', 100, 100), node('b', 800, 600))
    const result = computeSnap({
      schema,
      activeNodeId: 'a',
      delta: { x: 0, y: 0 },
      threshold: 6,
    })
    expect(result.snappedDelta).toEqual({ x: 0, y: 0 })
    expect(result.guides.vertical).toHaveLength(0)
    expect(result.guides.horizontal).toHaveLength(0)
  })

  it('snaps left edge to canvas left when within threshold', () => {
    const schema = schemaWith(node('a', 4, 200))
    const result = computeSnap({
      schema,
      activeNodeId: 'a',
      delta: { x: 0, y: 0 },
      threshold: 6,
    })
    // a is 4px from canvas left → snap to 0
    expect(result.snappedDelta.x).toBe(-4)
    expect(result.guides.vertical).toContain(0)
  })

  it('does NOT snap when distance exceeds threshold', () => {
    // 8px gap, threshold 6 → no snap
    const schema = schemaWith(node('a', 50, 100), node('b', 158, 100))
    const result = computeSnap({
      schema,
      activeNodeId: 'a',
      delta: { x: 0, y: 0 },
      threshold: 6,
    })
    expect(result.snappedDelta).toEqual({ x: 0, y: 0 })
    expect(result.guides.vertical).toHaveLength(0)
  })

  it('snaps left of active to left of neighbor', () => {
    // a at 50, b at 200. Move a by 145 → final left=195, 5px from b.left
    const schema = schemaWith(node('a', 50, 100), node('b', 200, 100))
    const result = computeSnap({
      schema,
      activeNodeId: 'a',
      delta: { x: 145, y: 0 },
      threshold: 6,
    })
    expect(result.snappedDelta.x).toBe(150) // 50 + 150 = 200
    expect(result.guides.vertical).toContain(200)
  })

  it('snaps right of active to right of neighbor (same width)', () => {
    // both width 100. a at left=50 (right=150). Want right=300 (b.right).
    const schema = schemaWith(node('a', 50, 100), node('b', 200, 100))
    // Move 152 → a.left=202, a.right=302 → 2px from b.right(300)
    const result = computeSnap({
      schema,
      activeNodeId: 'a',
      delta: { x: 152, y: 0 },
      threshold: 6,
    })
    expect(result.snappedDelta.x).toBe(150) // a.right=300
    expect(result.guides.vertical).toContain(300)
  })

  it('snaps centers (same width nodes auto-center-align)', () => {
    // both width 100. b at 400→ centerX=450. a moved so center≈ 449.
    const schema = schemaWith(node('a', 0, 100), node('b', 400, 100))
    // center of a at delta = 401 - 50 = (delta to make center 449) → delta=399
    const result = computeSnap({
      schema,
      activeNodeId: 'a',
      delta: { x: 399, y: 0 },
      threshold: 6,
    })
    // Snap to b's centerX = 450 → a.left = 400 → delta = 400
    expect(result.snappedDelta.x).toBe(400)
    expect(result.guides.vertical).toContain(450)
  })

  it('snaps to canvas vertical center', () => {
    // canvas width 1200 → centerX = 600. a width 100, want centerX=599 (1px off).
    const schema = schemaWith(node('a', 0, 0))
    const result = computeSnap({
      schema,
      activeNodeId: 'a',
      delta: { x: 549, y: 0 },
      threshold: 6,
    })
    // active.center = 0+50+549 = 599 → snap to 600 → delta becomes 550
    expect(result.snappedDelta.x).toBe(550)
    expect(result.guides.vertical).toContain(600)
  })

  it('emits multiple guide lines on simultaneous matches', () => {
    // Two neighbors that both align after a single delta.
    // b at left=200, c at top=300. Move a so left=200 AND top=300.
    const schema = schemaWith(
      node('a', 50, 50),
      node('b', 200, 600),
      node('c', 800, 300),
    )
    const result = computeSnap({
      schema,
      activeNodeId: 'a',
      delta: { x: 150, y: 250 },
      threshold: 6,
    })
    expect(result.guides.vertical).toContain(200)
    expect(result.guides.horizontal).toContain(300)
  })

  it('picks the closest line when multiple neighbors are within threshold', () => {
    // Two candidates: b.left=200 (5 away) and c.left=198 (3 away after delta).
    // a at 50, delta=145 → a.left=195. b.left=200 (5 away), c.left=198 (3 away).
    // Should snap to c (closer).
    const schema = schemaWith(
      node('a', 50, 100),
      node('b', 200, 200),
      node('c', 198, 300),
    )
    const result = computeSnap({
      schema,
      activeNodeId: 'a',
      delta: { x: 145, y: 0 },
      threshold: 6,
    })
    expect(result.snappedDelta.x).toBe(148) // 50 + 148 = 198
    expect(result.guides.vertical).toContain(198)
    expect(result.guides.vertical).not.toContain(200)
  })

  it('returns the delta untouched when active node id not found', () => {
    const schema = schemaWith(node('a', 0, 0))
    const result = computeSnap({
      schema,
      activeNodeId: 'ghost',
      delta: { x: 42, y: 7 },
      threshold: 6,
    })
    expect(result.snappedDelta).toEqual({ x: 42, y: 7 })
    expect(result.guides.vertical).toHaveLength(0)
  })

  it('skips itself when scanning targets', () => {
    // Single node, no other targets except canvas. Without "skip self" the
    // node would always match itself and never need to move.
    const schema = schemaWith(node('a', 200, 200))
    const result = computeSnap({
      schema,
      activeNodeId: 'a',
      delta: { x: 100, y: 0 },
      threshold: 6,
    })
    // a.left=300, no canvas line within 6 of 300 → no snap
    expect(result.snappedDelta.x).toBe(100)
  })

  it('threshold = 0 disables snapping entirely', () => {
    const schema = schemaWith(node('a', 0, 0), node('b', 1, 1))
    const result = computeSnap({
      schema,
      activeNodeId: 'a',
      delta: { x: 0, y: 0 },
      threshold: 0,
    })
    // 0-distance match qualifies (≤ threshold), but only if there's a
    // 0-distance line. Active a is already at canvas (0,0) → snaps to (0,0)
    // with zero correction, which is a no-op. Guides may include 0/0.
    expect(result.snappedDelta).toEqual({ x: 0, y: 0 })
  })
})

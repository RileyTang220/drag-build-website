/**
 * Alignment snapping for drag operations.
 *
 * For each tracked node we collect 6 "anchor" coordinates:
 *   - x: left edge, horizontal center, right edge
 *   - y: top edge, vertical center, bottom edge
 *
 * Plus the canvas's own 3 vertical and 3 horizontal "guide" coordinates
 * (edge / center / edge). When the dragged node's anchors fall within
 * `threshold` canvas-pixels of any guide, we snap to it AND emit the
 * guide line(s) for the overlay to render.
 *
 * This module is pure: same inputs → same outputs. The same function is
 * called by the dnd-kit modifier (to adjust the transform) and by the
 * `onDragMove` handler (to publish guide lines into Zustand). Keeping
 * them in sync prevents the visual line from drifting away from where
 * the snap actually settles.
 */
import type { PageSchema } from '@/types/schema'

export interface SnapInput {
  schema: PageSchema
  activeNodeId: string
  /** Drag delta in canvas-space pixels, accumulated since drag start. */
  delta: { x: number; y: number }
  /** Snap threshold in canvas-space pixels. */
  threshold: number
}

export interface SnapResult {
  /** Adjusted delta — same as input + a snap correction (also canvas-space). */
  snappedDelta: { x: number; y: number }
  guides: {
    /** x-coordinates (canvas-space) of vertical lines to draw. */
    vertical: number[]
    /** y-coordinates (canvas-space) of horizontal lines to draw. */
    horizontal: number[]
  }
}

const EMPTY_GUIDES = { vertical: [], horizontal: [] }

export function computeSnap(input: SnapInput): SnapResult {
  const { schema, activeNodeId, delta, threshold } = input
  const active = schema.nodes.find((n) => n.id === activeNodeId)
  if (!active) {
    return { snappedDelta: delta, guides: EMPTY_GUIDES }
  }

  const w = active.style.width ?? 0
  const h = active.style.height ?? 0
  const aLeft = active.style.left + delta.x
  const aTop = active.style.top + delta.y
  const aRight = aLeft + w
  const aBottom = aTop + h
  const aCenterX = (aLeft + aRight) / 2
  const aCenterY = (aTop + aBottom) / 2

  // Build target lines: canvas edges + center, then every other node's anchors.
  const xLines: number[] = [0, schema.canvas.width / 2, schema.canvas.width]
  const yLines: number[] = [0, schema.canvas.height / 2, schema.canvas.height]

  for (const node of schema.nodes) {
    if (node.id === activeNodeId) continue
    const nw = node.style.width ?? 0
    const nh = node.style.height ?? 0
    const l = node.style.left
    const t = node.style.top
    xLines.push(l, l + nw / 2, l + nw)
    yLines.push(t, t + nh / 2, t + nh)
  }

  // Pick the smallest correction that brings any active anchor onto a target.
  const aXs = [aLeft, aCenterX, aRight]
  const aYs = [aTop, aCenterY, aBottom]

  let bestDx = 0
  let bestDxAbs = Infinity
  for (const aX of aXs) {
    for (const tX of xLines) {
      const d = tX - aX
      const ad = Math.abs(d)
      if (ad <= threshold && ad < bestDxAbs) {
        bestDxAbs = ad
        bestDx = d
      }
    }
  }

  let bestDy = 0
  let bestDyAbs = Infinity
  for (const aY of aYs) {
    for (const tY of yLines) {
      const d = tY - aY
      const ad = Math.abs(d)
      if (ad <= threshold && ad < bestDyAbs) {
        bestDyAbs = ad
        bestDy = d
      }
    }
  }

  // After applying the snap correction, find ALL guide lines that align —
  // there may be more than one (e.g., active.left aligns with otherA.left
  // *and* active.right aligns with otherB.right after the correction).
  const verticals = new Set<number>()
  for (const aX of aXs) {
    const snappedX = aX + bestDx
    for (const tX of xLines) {
      if (Math.abs(tX - snappedX) < 0.5) {
        verticals.add(tX)
        break
      }
    }
  }
  const horizontals = new Set<number>()
  for (const aY of aYs) {
    const snappedY = aY + bestDy
    for (const tY of yLines) {
      if (Math.abs(tY - snappedY) < 0.5) {
        horizontals.add(tY)
        break
      }
    }
  }

  return {
    snappedDelta: { x: delta.x + bestDx, y: delta.y + bestDy },
    guides: {
      vertical: Array.from(verticals),
      horizontal: Array.from(horizontals),
    },
  }
}

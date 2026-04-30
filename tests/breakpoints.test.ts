import { describe, it, expect } from 'vitest'
import {
  BREAKPOINTS,
  detectBreakpoint,
  effectiveStyle,
  hasOverride,
  styleUpdatePayload,
} from '@/lib/editor/breakpoints'
import type { ComponentNode } from '@/types/schema'

const baseNode = (overrides?: Partial<ComponentNode>): ComponentNode => ({
  id: 'n',
  type: 'Text',
  props: {},
  style: {
    position: 'absolute',
    left: 100,
    top: 50,
    width: 200,
    height: 60,
    fontSize: 16,
    color: '#111',
  },
  ...overrides,
})

describe('detectBreakpoint', () => {
  it('uses 1024 as the desktop threshold', () => {
    expect(detectBreakpoint(1023)).toBe('tablet')
    expect(detectBreakpoint(1024)).toBe('desktop')
    expect(detectBreakpoint(2560)).toBe('desktop')
  })

  it('uses 640 as the tablet floor', () => {
    expect(detectBreakpoint(640)).toBe('tablet')
    expect(detectBreakpoint(639)).toBe('mobile')
  })

  it('rounds tiny / non-finite numbers safely', () => {
    expect(detectBreakpoint(0)).toBe('mobile')
  })
})

describe('effectiveStyle', () => {
  it('returns base unchanged at desktop', () => {
    const node = baseNode({
      styleOverrides: { mobile: { fontSize: 11 } },
    })
    expect(effectiveStyle(node, 'desktop', 1200)).toBe(node.style)
  })

  it('fluid-scales positions/sizes by canvasWidth ratio when no override', () => {
    // 1200 → 375 = 0.3125. left 100 → 31.25, width 200 → 62.5
    const node = baseNode()
    const eff = effectiveStyle(node, 'mobile', 1200)
    expect(eff.left).toBeCloseTo(31.25, 1)
    expect(eff.width).toBeCloseTo(62.5, 1)
    // top scales too (default Y also scales)
    expect(eff.top).toBeCloseTo(15.625, 1)
  })

  it('uses the override absolute value (no extra scaling)', () => {
    const node = baseNode({
      styleOverrides: { mobile: { left: 20, width: 300 } },
    })
    const eff = effectiveStyle(node, 'mobile', 1200)
    expect(eff.left).toBe(20)
    expect(eff.width).toBe(300)
    // top wasn't overridden → still scaled
    expect(eff.top).toBeCloseTo(15.625, 1)
  })

  it('scales fontSize gentler (sqrt curve) with a 10px floor', () => {
    // factor 0.3125 → sqrt ≈ 0.559 → 16 * 0.559 ≈ 9, floor to 10
    const node = baseNode({ style: { ...baseNode().style, fontSize: 16 } })
    const eff = effectiveStyle(node, 'mobile', 1200)
    expect(eff.fontSize).toBe(10) // floored
    // Larger font shouldn't hit the floor.
    const big = baseNode({ style: { ...baseNode().style, fontSize: 64 } })
    const effBig = effectiveStyle(big, 'mobile', 1200)
    expect(effBig.fontSize).toBe(Math.round(64 * Math.sqrt(0.3125)))
  })

  it('treats tablet and mobile independently', () => {
    const node = baseNode({
      styleOverrides: { tablet: { fontSize: 14 }, mobile: { fontSize: 11 } },
    })
    expect(effectiveStyle(node, 'tablet', 1200).fontSize).toBe(14)
    expect(effectiveStyle(node, 'mobile', 1200).fontSize).toBe(11)
  })
})

describe('hasOverride', () => {
  it('always false at desktop', () => {
    const node = baseNode({ styleOverrides: { mobile: { color: '#fff' } } })
    expect(hasOverride(node, 'desktop', 'color')).toBe(false)
  })

  it('detects per-key override presence', () => {
    const node = baseNode({ styleOverrides: { mobile: { color: '#fff' } } })
    expect(hasOverride(node, 'mobile', 'color')).toBe(true)
    expect(hasOverride(node, 'mobile', 'fontSize')).toBe(false)
  })
})

describe('styleUpdatePayload', () => {
  it('merges into base style at desktop', () => {
    const node = baseNode()
    const payload = styleUpdatePayload(node, { fontSize: 24 }, 'desktop')
    expect(payload).toEqual({
      style: { ...node.style, fontSize: 24 },
    })
    expect('styleOverrides' in payload).toBe(false)
  })

  it('creates a fresh override at tablet/mobile', () => {
    const node = baseNode()
    const payload = styleUpdatePayload(node, { fontSize: 11 }, 'mobile')
    expect(payload.style).toBeUndefined()
    expect(payload.styleOverrides?.mobile).toEqual({ fontSize: 11 })
    expect(payload.styleOverrides?.tablet).toBeUndefined()
  })

  it('extends an existing override without dropping previous keys', () => {
    const node = baseNode({
      styleOverrides: { mobile: { color: '#fff', fontSize: 11 } },
    })
    const payload = styleUpdatePayload(node, { fontSize: 13 }, 'mobile')
    expect(payload.styleOverrides?.mobile).toEqual({
      color: '#fff',
      fontSize: 13,
    })
  })

  it('does not mutate the input node', () => {
    const node = baseNode()
    styleUpdatePayload(node, { fontSize: 99 }, 'desktop')
    expect(node.style.fontSize).toBe(16)
  })
})

describe('BREAKPOINTS constant', () => {
  it('has exactly desktop, tablet, mobile in that order', () => {
    expect(BREAKPOINTS).toEqual(['desktop', 'tablet', 'mobile'])
  })
})

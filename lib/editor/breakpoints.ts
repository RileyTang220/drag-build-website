// Responsive-breakpoint primitives.
//
// Schema model: each ComponentNode carries a base `style` (= desktop) plus
// an optional `styleOverrides` map keyed by tablet / mobile. At render
// time we MERGE — overrides only need to specify the fields that differ.
//
// Editor: a toolbar switcher changes `currentBreakpoint`. The Canvas
// re-clamps to that breakpoint's width and every read/write goes through
// the helpers below so position drags etc. land in the right slot.
//
// Runtime: the published page picks a breakpoint from `window.innerWidth`
// (matchMedia), so the same schema can render three different layouts
// without the visitor doing anything.
import type { ComponentNode, ComponentStyle } from '@/types/schema'

export const BREAKPOINTS = ['desktop', 'tablet', 'mobile'] as const
export type Breakpoint = (typeof BREAKPOINTS)[number]

/** Canvas widths shown in the editor for each breakpoint. `null` = use
 *  the schema's own canvas.width (desktop default). */
export const BREAKPOINT_CANVAS_WIDTH: Record<Breakpoint, number | null> = {
  desktop: null,
  tablet: 768,
  mobile: 375,
}

/** Used when the caller doesn't pass an explicit desktop canvas width. */
const DEFAULT_DESKTOP_WIDTH = 1200

export const BREAKPOINT_LABEL: Record<Breakpoint, string> = {
  desktop: 'Desktop',
  tablet: 'Tablet',
  mobile: 'Mobile',
}

/**
 * Pick the breakpoint that matches a given viewport width. Thresholds line
 * up with Tailwind's `sm` (640) and `lg` (1024), which most designs assume.
 */
export function detectBreakpoint(viewportWidth: number): Breakpoint {
  if (viewportWidth >= 1024) return 'desktop'
  if (viewportWidth >= 640) return 'tablet'
  return 'mobile'
}

/**
 * Merge a node's base style with its override for the given breakpoint.
 *
 * Desktop = base unchanged.
 *
 * Tablet / mobile = **fluid auto-scaled base**, then per-field override.
 * That means a node at `left: 800` on a 1200-wide canvas becomes
 * `left: 250` on a 375-wide mobile canvas WITHOUT the user setting any
 * override — proportional layout "just works" by default. Per-field
 * overrides are ABSOLUTE values for that breakpoint and always win, so
 * `mobile.fontSize: 18` means literally 18px on the mobile canvas
 * regardless of the auto-scale factor.
 *
 * `fontSize`, `borderWidth`, `borderRadius`, `padding`, `margin` use a
 * gentler `sqrt(factor)` curve + a 10px floor so text and visual
 * affordances stay readable when the factor is small (~0.31 at mobile).
 */
export function effectiveStyle(
  node: ComponentNode,
  bp: Breakpoint,
  desktopCanvasWidth: number = DEFAULT_DESKTOP_WIDTH,
): ComponentStyle {
  if (bp === 'desktop') return node.style

  const targetWidth = BREAKPOINT_CANVAS_WIDTH[bp]
  if (targetWidth == null) return node.style // shouldn't fire for tablet/mobile

  const factor = targetWidth / desktopCanvasWidth
  const visualFactor = Math.sqrt(Math.max(factor, 0.0001)) // gentler curve
  const override = node.styleOverrides?.[bp] ?? {}

  // Pick override if defined, otherwise scale base by `factor`.
  const scaled = (
    overrideValue: number | undefined,
    baseValue: number | undefined,
  ): number | undefined => {
    if (overrideValue !== undefined) return overrideValue
    if (baseValue === undefined) return undefined
    return Math.round(baseValue * factor * 100) / 100
  }
  // Same idea but with the gentler curve + readability floor.
  const scaledVisual = (
    overrideValue: number | undefined,
    baseValue: number | undefined,
    floor = 10,
  ): number | undefined => {
    if (overrideValue !== undefined) return overrideValue
    if (baseValue === undefined) return undefined
    return Math.max(floor, Math.round(baseValue * visualFactor))
  }

  return {
    position: 'absolute',
    left: scaled(override.left, node.style.left)!,
    top: scaled(override.top, node.style.top)!,
    width: scaled(override.width, node.style.width),
    height: scaled(override.height, node.style.height),
    rotate: override.rotate ?? node.style.rotate,
    zIndex: override.zIndex ?? node.style.zIndex,
    fontSize: scaledVisual(override.fontSize, node.style.fontSize, 10),
    color: override.color ?? node.style.color,
    backgroundColor: override.backgroundColor ?? node.style.backgroundColor,
    borderColor: override.borderColor ?? node.style.borderColor,
    borderStyle: override.borderStyle ?? node.style.borderStyle,
    borderWidth: scaledVisual(override.borderWidth, node.style.borderWidth, 0),
    borderRadius: scaledVisual(override.borderRadius, node.style.borderRadius, 0),
    padding: scaledVisual(override.padding, node.style.padding, 0),
    margin: scaledVisual(override.margin, node.style.margin, 0),
    textAlign: override.textAlign ?? node.style.textAlign,
    fontWeight: override.fontWeight ?? node.style.fontWeight,
  }
}

/**
 * Build the partial node update needed to write `partialStyle` into the
 * correct slot for the active breakpoint:
 *   - desktop → merge into base `style`
 *   - tablet/mobile → merge into `styleOverrides[bp]`
 *
 * Always returns a *fresh* object tree so the Zustand setter sees a
 * reference change and downstream selectors fire.
 */
export function styleUpdatePayload(
  node: ComponentNode,
  partialStyle: Partial<ComponentStyle>,
  bp: Breakpoint,
): Partial<ComponentNode> {
  if (bp === 'desktop') {
    return { style: { ...node.style, ...partialStyle } }
  }
  const existing = node.styleOverrides?.[bp] ?? {}
  return {
    styleOverrides: {
      ...node.styleOverrides,
      [bp]: { ...existing, ...partialStyle },
    },
  }
}

/** True when a specific style key is overridden at the given breakpoint. */
export function hasOverride(
  node: ComponentNode,
  bp: Breakpoint,
  key: keyof ComponentStyle,
): boolean {
  if (bp === 'desktop') return false
  return node.styleOverrides?.[bp]?.[key] !== undefined
}

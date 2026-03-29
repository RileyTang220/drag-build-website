// 与编辑器侧栏 Tailwind 宽度一致，用于推算「中间画布区」默认可用尺寸

/** ComponentPalette: w-56 */
export const EDITOR_PALETTE_WIDTH = 224
/** PropertyPanel: w-72 */
export const EDITOR_PROPERTY_WIDTH = 288
/** Editor header: h-12 */
export const EDITOR_HEADER_HEIGHT = 48
/** canvas-drop-zone: p-6，左右 / 上下各 24px */
export const EDITOR_CANVAS_AREA_PADDING_X = 48
export const EDITOR_CANVAS_AREA_PADDING_Y = 48

const MIN_CANVAS_W = 320
const MIN_CANVAS_H = 240
const MAX_CANVAS_W = 2560
const MAX_CANVAS_H = 1600

/**
 * 视口下近似「中间白色画板」的宽高 = 视口减去两侧栏、工具栏与画布区域内边距。
 */
export function getDefaultCanvasSize(viewportW: number, viewportH: number) {
  const rawW =
    viewportW -
    EDITOR_PALETTE_WIDTH -
    EDITOR_PROPERTY_WIDTH -
    EDITOR_CANVAS_AREA_PADDING_X
  const rawH =
    viewportH - EDITOR_HEADER_HEIGHT - EDITOR_CANVAS_AREA_PADDING_Y

  const width = Math.round(
    Math.min(MAX_CANVAS_W, Math.max(MIN_CANVAS_W, rawW))
  )
  const height = Math.round(
    Math.min(MAX_CANVAS_H, Math.max(MIN_CANVAS_H, rawH))
  )
  return { width, height }
}

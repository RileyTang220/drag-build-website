// Renders the magenta alignment guides shown while dragging.
//
// Lives INSIDE the scaled artboard so the line coordinates are in
// canvas-space (no manual zoom math needed). Stroke is 1px on screen
// regardless of zoom thanks to `vector-effect="non-scaling-stroke"`.
'use client'

import type { DragGuides } from '@/store/editorStore'

interface GuideOverlayProps {
  guides: DragGuides
  canvasWidth: number
  canvasHeight: number
}

const GUIDE_COLOR = '#ff00aa' // hot pink — same as Figma / Sketch convention

export function GuideOverlay({ guides, canvasWidth, canvasHeight }: GuideOverlayProps) {
  if (guides.vertical.length === 0 && guides.horizontal.length === 0) {
    return null
  }
  return (
    <svg
      width={canvasWidth}
      height={canvasHeight}
      viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9999,
        overflow: 'visible',
      }}
    >
      {guides.vertical.map((x) => (
        <line
          key={`v-${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={canvasHeight}
          stroke={GUIDE_COLOR}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {guides.horizontal.map((y) => (
        <line
          key={`h-${y}`}
          x1={0}
          y1={y}
          x2={canvasWidth}
          y2={y}
          stroke={GUIDE_COLOR}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  )
}

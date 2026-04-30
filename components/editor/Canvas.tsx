// Canvas - Wix-style editing area with grid and zoom
'use client'

import { useDroppable } from '@dnd-kit/core'
import { useEditorStore } from '@/store/editorStore'
import { BREAKPOINT_CANVAS_WIDTH } from '@/lib/editor/breakpoints'
import { ComponentRenderer } from './ComponentRenderer'
import { GuideOverlay } from './GuideOverlay'
import { CollabCursors } from './CollabCursors'
import type { PeerState } from '@/lib/collab/session'

interface CanvasProps {
  zoom?: number
  peers?: PeerState[]
}

export function Canvas({ zoom = 1, peers = [] }: CanvasProps) {
  const { schema, selectedId, setSelectedId, dragGuides, currentBreakpoint } =
    useEditorStore()

  const { setNodeRef } = useDroppable({
    id: 'canvas',
    data: { type: 'canvas' },
  })

  if (!schema) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[#8c8c8c]">Drop elements here to build your page</p>
      </div>
    )
  }

  // Switching to tablet/mobile narrows the artboard. Height scales by
  // the same factor so the canvas doesn't look stretched / squashed
  // relative to its desktop aspect ratio.
  const canvasWidth =
    BREAKPOINT_CANVAS_WIDTH[currentBreakpoint] ?? schema.canvas.width
  const widthFactor = canvasWidth / schema.canvas.width
  const canvasHeight = Math.round(schema.canvas.height * widthFactor)

  return (
    <div className="flex items-center justify-center min-h-full">
      <div
        className="relative rounded-lg overflow-hidden shadow-xl"
        style={{
          backgroundImage: `
            linear-gradient(#e0e0e0 1px, transparent 1px),
            linear-gradient(90deg, #e0e0e0 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
          padding: 24,
        }}
      >
        <div
          id="canvas-artboard"
          ref={setNodeRef}
          className="bg-white relative overflow-hidden"
          style={{
            width: canvasWidth,
            height: canvasHeight,
            backgroundColor: schema.canvas.background || '#ffffff',
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          {schema.nodes.map((node) => (
            <ComponentRenderer
              key={node.id}
              node={node}
              isSelected={selectedId === node.id}
              onSelect={() => setSelectedId(node.id)}
              breakpoint={currentBreakpoint}
              desktopCanvasWidth={schema.canvas.width}
            />
          ))}
          <GuideOverlay
            guides={dragGuides}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
          />
          <CollabCursors peers={peers} schema={schema} zoom={zoom} />
        </div>
      </div>
    </div>
  )
}

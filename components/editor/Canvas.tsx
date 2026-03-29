// Canvas - Wix-style editing area with grid and zoom
'use client'

import { useDroppable } from '@dnd-kit/core'
import { useEditorStore } from '@/store/editorStore'
import { ComponentRenderer } from './ComponentRenderer'

interface CanvasProps {
  zoom?: number
}

export function Canvas({ zoom = 1 }: CanvasProps) {
  const { schema, selectedId, setSelectedId } = useEditorStore()

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
            width: schema.canvas.width,
            height: schema.canvas.height,
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
            />
          ))}
        </div>
      </div>
    </div>
  )
}

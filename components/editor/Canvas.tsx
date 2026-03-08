// Canvas component - main editing area
'use client'

import { useDroppable } from '@dnd-kit/core'
import { useEditorStore } from '@/store/editorStore'
import { ComponentRenderer } from './ComponentRenderer'

export function Canvas() {
  const { schema, selectedId, setSelectedId } = useEditorStore()

  const { setNodeRef } = useDroppable({
    id: 'canvas',
    data: {
      type: 'canvas',
    },
  })

  if (!schema) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">No schema loaded</div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8" id="canvas-drop-zone">
      <div
        ref={setNodeRef}
        className="bg-white shadow-lg relative"
        style={{
          width: schema.canvas.width,
          height: schema.canvas.height,
          backgroundColor: schema.canvas.background || '#ffffff',
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
  )
}

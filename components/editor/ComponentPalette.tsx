// Component palette - drag components from here to canvas
'use client'

import { useDraggable } from '@dnd-kit/core'
import { ComponentType } from '@/types/schema'

const components: { type: ComponentType; label: string; icon: string }[] = [
  { type: 'Text', label: 'Text', icon: 'T' },
  { type: 'Image', label: 'Image', icon: '🖼️' },
  { type: 'Button', label: 'Button', icon: '🔘' },
  { type: 'Container', label: 'Container', icon: '📦' },
]

function DraggableComponent({
  type,
  label,
  icon,
}: {
  type: ComponentType
  label: string
  icon: string
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `palette-${type}`,
      data: {
        type: 'palette-item',
        componentType: type,
      },
    })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        p-4 bg-white border-2 border-dashed border-gray-300 rounded-lg
        cursor-grab active:cursor-grabbing
        hover:border-blue-500 hover:bg-blue-50
        transition-colors
        ${isDragging ? 'opacity-50' : ''}
      `}
    >
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-sm font-medium">{label}</div>
    </div>
  )
}

export function ComponentPalette() {
  return (
    <div className="w-64 bg-white border-r p-4 overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4">Components</h2>
      <div className="space-y-3">
        {components.map((comp) => (
          <DraggableComponent key={comp.type} {...comp} />
        ))}
      </div>
    </div>
  )
}

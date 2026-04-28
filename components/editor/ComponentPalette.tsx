// Component palette - Wix-style add elements sidebar
'use client'

import { useDraggable } from '@dnd-kit/core'
import { ComponentType } from '@/types/schema'
import { componentRegistry, PALETTE_ORDER } from '@/components/registry'

interface DraggableItemProps {
  type: ComponentType
  label: string
  icon: string
  description: string
}

function DraggableItem({ type, label, icon, description }: DraggableItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { type: 'palette-item', componentType: type },
  })

  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      {...listeners}
      {...attributes}
      title={description}
      className={`
        flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-grab active:cursor-grabbing
        text-[#cccccc] hover:bg-[#2d2d2d] hover:text-white transition-colors
        ${isDragging ? 'opacity-50' : ''}
      `}
    >
      <span className="w-8 h-8 flex items-center justify-center bg-[#3c3c3c] rounded text-sm font-medium">
        {icon}
      </span>
      <span className="text-sm">{label}</span>
    </div>
  )
}

export function ComponentPalette() {
  return (
    <div className="w-56 flex-shrink-0 bg-[#252526] border-r border-[#3c3c3c] flex flex-col">
      <div className="px-3 py-3 border-b border-[#3c3c3c]">
        <h2 className="text-xs font-medium text-[#8c8c8c] uppercase tracking-wide">Add Elements</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {PALETTE_ORDER.map((type) => {
          const def = componentRegistry[type]
          return (
            <DraggableItem
              key={type}
              type={type}
              label={def.label}
              icon={def.icon}
              description={def.description}
            />
          )
        })}
      </div>
    </div>
  )
}

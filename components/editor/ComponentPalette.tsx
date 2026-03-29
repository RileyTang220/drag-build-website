// Component palette - Wix-style add elements sidebar
'use client'

import { useDraggable } from '@dnd-kit/core'
import { ComponentType } from '@/types/schema'

const COMPONENTS: { type: ComponentType; label: string; icon: string }[] = [
  { type: 'Text', label: 'Text', icon: 'T' },
  { type: 'Image', label: 'Image', icon: '🖼' },
  { type: 'Button', label: 'Button', icon: '▶' },
  { type: 'Container', label: 'Box', icon: '▢' },
]

function DraggableItem({ type, label, icon }: { type: ComponentType; label: string; icon: string }) {
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
        {COMPONENTS.map((c) => (
          <DraggableItem key={c.type} type={c.type} label={c.label} icon={c.icon} />
        ))}
      </div>
    </div>
  )
}

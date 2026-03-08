// Container component for grouping other components
import { ComponentNode } from '@/types/schema'

interface ContainerComponentProps {
  node: ComponentNode
}

export function ContainerComponent({ node }: ContainerComponentProps) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: node.style.backgroundColor || 'transparent',
        border: node.style.borderWidth
          ? `${node.style.borderWidth}px solid ${node.style.borderColor || '#000000'}`
          : undefined,
        borderRadius: node.style.borderRadius ? `${node.style.borderRadius}px` : undefined,
        padding: node.style.padding ? `${node.style.padding}px` : undefined,
        position: 'relative',
      }}
    >
      {/* Container can hold children, but rendering is handled by parent */}
      {node.children && node.children.length > 0 && (
        <div className="text-xs text-gray-400 p-2">
          Container ({node.children.length} children)
        </div>
      )}
    </div>
  )
}

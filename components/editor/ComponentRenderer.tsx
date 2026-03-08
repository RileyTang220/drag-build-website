// Component renderer - renders individual components on canvas
'use client'

import { useDraggable } from '@dnd-kit/core'
import { ComponentNode } from '@/types/schema'
import { TextComponent } from '../components/TextComponent'
import { ImageComponent } from '../components/ImageComponent'
import { ButtonComponent } from '../components/ButtonComponent'
import { ContainerComponent } from '../components/ContainerComponent'

interface ComponentRendererProps {
  node: ComponentNode
  isSelected: boolean
  onSelect: () => void
}

export function ComponentRenderer({
  node,
  isSelected,
  onSelect,
}: ComponentRendererProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: node.id,
      data: {
        type: 'canvas-node',
        node,
      },
    })

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${node.style.left}px`,
    top: `${node.style.top}px`,
    width: node.style.width ? `${node.style.width}px` : 'auto',
    height: node.style.height ? `${node.style.height}px` : 'auto',
    zIndex: node.style.zIndex || 1,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    border: isSelected ? '2px solid #3b82f6' : '2px solid transparent',
    cursor: 'move',
    opacity: isDragging ? 0.5 : 1,
    // Merge additional styles from node.style, but don't override position
    fontSize: node.style.fontSize ? `${node.style.fontSize}px` : undefined,
    color: node.style.color,
    backgroundColor: node.style.backgroundColor,
    borderColor: node.style.borderColor,
    borderWidth: node.style.borderWidth ? `${node.style.borderWidth}px` : undefined,
    borderRadius: node.style.borderRadius ? `${node.style.borderRadius}px` : undefined,
    padding: node.style.padding ? `${node.style.padding}px` : undefined,
    margin: node.style.margin ? `${node.style.margin}px` : undefined,
    textAlign: node.style.textAlign,
    fontWeight: node.style.fontWeight,
  }

  const renderComponent = () => {
    switch (node.type) {
      case 'Text':
        return <TextComponent {...node.props} />
      case 'Image':
        return <ImageComponent {...node.props} />
      case 'Button':
        return <ButtonComponent {...node.props} />
      case 'Container':
        return <ContainerComponent node={node} />
      default:
        return <div>Unknown component: {node.type}</div>
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
      className={isSelected ? 'ring-2 ring-blue-500' : ''}
    >
      {renderComponent()}
    </div>
  )
}

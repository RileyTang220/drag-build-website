// Component renderer - renders individual components on canvas
'use client'

import { useDraggable } from '@dnd-kit/core'
import { ComponentNode } from '@/types/schema'
import { TextComponent } from '../components/TextComponent'
import { HeadingComponent } from '../components/HeadingComponent'
import { ImageComponent } from '../components/ImageComponent'
import { ButtonComponent } from '../components/ButtonComponent'
import { ContainerComponent } from '../components/ContainerComponent'
import { DividerComponent } from '../components/DividerComponent'
import { InputComponent } from '../components/InputComponent'
import { MapComponent } from '../components/MapComponent'

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
    borderWidth: isSelected ? 2 : (node.style.borderWidth ?? 0),
    borderStyle: 'solid',
    borderColor: isSelected ? '#2b579a' : (node.style.borderColor || 'transparent'),
    cursor: 'move',
    opacity: isDragging ? 0.5 : 1,
    fontSize: node.style.fontSize ? `${node.style.fontSize}px` : undefined,
    color: node.style.color,
    // The Container, Input, Map and Divider components paint their own
    // background (often together with border-radius / clipping). Letting the
    // wrapper also set bg would double-render and made bg color changes look
    // stale when only one layer updated.
    backgroundColor:
      node.type === 'Container' ||
      node.type === 'Input' ||
      node.type === 'Map' ||
      node.type === 'Divider'
        ? undefined
        : node.style.backgroundColor,
    borderRadius: node.style.borderRadius ? `${node.style.borderRadius}px` : undefined,
    padding: node.style.padding ? `${node.style.padding}px` : undefined,
    margin: node.style.margin ? `${node.style.margin}px` : undefined,
    textAlign: node.style.textAlign,
    fontWeight: node.style.fontWeight,
  }

  const renderComponent = () => {
    switch (node.type) {
      case 'Text':
        return (
          <TextComponent
            {...node.props}
            color={node.style.color}
            fontSize={node.style.fontSize}
            fontWeight={node.style.fontWeight}
            textAlign={node.style.textAlign}
          />
        )
      case 'Heading':
        return (
          <HeadingComponent
            {...node.props}
            color={node.style.color}
            fontSize={node.style.fontSize}
            fontWeight={node.style.fontWeight}
            textAlign={node.style.textAlign}
          />
        )
      case 'Image':
        return <ImageComponent {...node.props} />
      case 'Button':
        return (
          <ButtonComponent
            {...node.props}
            backgroundColor={node.style.backgroundColor}
            color={node.style.color}
            borderRadius={node.style.borderRadius}
          />
        )
      case 'Container':
        return <ContainerComponent node={node} />
      case 'Divider':
        return (
          <DividerComponent
            backgroundColor={node.style.backgroundColor}
            borderStyle={node.style.borderStyle}
            borderColor={node.style.borderColor}
            borderWidth={node.style.borderWidth}
          />
        )
      case 'Input':
        return (
          <InputComponent
            {...node.props}
            color={node.style.color}
            fontSize={node.style.fontSize}
            backgroundColor={node.style.backgroundColor}
            borderColor={node.style.borderColor}
            borderRadius={node.style.borderRadius}
            editable={false} /* canvas is for layout, not data entry */
          />
        )
      case 'Map':
        return (
          <MapComponent
            {...node.props}
            borderRadius={node.style.borderRadius}
          />
        )
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
      className={isSelected ? 'ring-2 ring-[#2b579a] ring-offset-1' : ''}
    >
      {renderComponent()}
    </div>
  )
}

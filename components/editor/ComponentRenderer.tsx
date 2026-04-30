// Component renderer - renders individual components on canvas
'use client'

import { useDraggable } from '@dnd-kit/core'
import { ComponentNode } from '@/types/schema'
import { effectiveStyle, type Breakpoint } from '@/lib/editor/breakpoints'
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
  /** Active breakpoint — drives effective style merging. */
  breakpoint: Breakpoint
  /** Schema's desktop canvas width — needed for fluid auto-scaling. */
  desktopCanvasWidth: number
}

export function ComponentRenderer({
  node,
  isSelected,
  onSelect,
  breakpoint,
  desktopCanvasWidth,
}: ComponentRendererProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: node.id,
      data: {
        type: 'canvas-node',
        node,
      },
    })

  const s = effectiveStyle(node, breakpoint, desktopCanvasWidth)

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${s.left}px`,
    top: `${s.top}px`,
    width: s.width ? `${s.width}px` : 'auto',
    height: s.height ? `${s.height}px` : 'auto',
    zIndex: s.zIndex || 1,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    borderWidth: isSelected ? 2 : (s.borderWidth ?? 0),
    borderStyle: 'solid',
    borderColor: isSelected ? '#2b579a' : (s.borderColor || 'transparent'),
    cursor: 'move',
    opacity: isDragging ? 0.5 : 1,
    fontSize: s.fontSize ? `${s.fontSize}px` : undefined,
    color: s.color,
    backgroundColor:
      node.type === 'Container' ||
      node.type === 'Input' ||
      node.type === 'Map' ||
      node.type === 'Divider'
        ? undefined
        : s.backgroundColor,
    borderRadius: s.borderRadius ? `${s.borderRadius}px` : undefined,
    padding: s.padding ? `${s.padding}px` : undefined,
    margin: s.margin ? `${s.margin}px` : undefined,
    textAlign: s.textAlign,
    fontWeight: s.fontWeight,
  }

  const renderComponent = () => {
    switch (node.type) {
      case 'Text':
        return (
          <TextComponent
            {...node.props}
            color={s.color}
            fontSize={s.fontSize}
            fontWeight={s.fontWeight}
            textAlign={s.textAlign}
          />
        )
      case 'Heading':
        return (
          <HeadingComponent
            {...node.props}
            color={s.color}
            fontSize={s.fontSize}
            fontWeight={s.fontWeight}
            textAlign={s.textAlign}
          />
        )
      case 'Image':
        return <ImageComponent {...node.props} />
      case 'Button':
        return (
          <ButtonComponent
            {...node.props}
            action="link"
            backgroundColor={s.backgroundColor}
            color={s.color}
            borderRadius={s.borderRadius}
          />
        )
      case 'Container':
        return <ContainerComponent node={{ ...node, style: s }} />
      case 'Divider':
        return (
          <DividerComponent
            backgroundColor={s.backgroundColor}
            borderStyle={s.borderStyle}
            borderColor={s.borderColor}
            borderWidth={s.borderWidth}
          />
        )
      case 'Input':
        return (
          <InputComponent
            {...node.props}
            color={s.color}
            fontSize={s.fontSize}
            backgroundColor={s.backgroundColor}
            borderColor={s.borderColor}
            borderRadius={s.borderRadius}
            editable={false}
          />
        )
      case 'Map':
        return (
          <MapComponent
            {...node.props}
            borderRadius={s.borderRadius}
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

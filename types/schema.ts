// Type definitions for page schema and components

export type ComponentType = 'Text' | 'Image' | 'Button' | 'Container'

export interface ComponentStyle {
  position: 'absolute'
  left: number
  top: number
  width?: number
  height?: number
  rotate?: number
  zIndex?: number
  fontSize?: number
  color?: string
  backgroundColor?: string
  borderColor?: string
  borderWidth?: number
  borderRadius?: number
  padding?: number
  margin?: number
  textAlign?: 'left' | 'center' | 'right'
  fontWeight?: string | number
  // Add other whitelisted CSS properties as needed
}

export interface ComponentNode {
  id: string
  type: ComponentType
  props: Record<string, unknown>
  style: ComponentStyle
  children?: ComponentNode[]
}

export interface PageSchema {
  canvas: {
    width: number
    height: number
    background?: string
  }
  nodes: ComponentNode[]
  meta?: {
    title?: string
    description?: string
  }
}

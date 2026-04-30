// Type definitions for page schema and components

export const COMPONENT_TYPES = [
  'Text',
  'Heading',
  'Image',
  'Button',
  'Container',
  'Divider',
  'Input',
  'Map',
] as const

export type ComponentType = (typeof COMPONENT_TYPES)[number]

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
  borderStyle?: 'solid' | 'dashed' | 'dotted'
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
  /** Base style — applied at desktop breakpoint and inherited by smaller ones. */
  style: ComponentStyle
  /**
   * Optional per-breakpoint overrides. Each entry is a partial style that
   * merges over the base when rendering at that breakpoint. Missing keys
   * inherit from the base.
   */
  styleOverrides?: {
    tablet?: Partial<ComponentStyle>
    mobile?: Partial<ComponentStyle>
  }
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

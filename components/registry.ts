/**
 * Component registry — single source of truth for component metadata.
 *
 * Adding a new component now requires only:
 *   1. Add the literal to COMPONENT_TYPES (types/schema.ts)
 *   2. Implement the component file under components/components/
 *   3. Add an entry here
 *   4. Wire it into the four render switches (Editor / Runtime / Property panel)
 *
 * Render functions deliberately stay in switch statements rather than living
 * here — JSX + per-component prop typing reads more naturally that way.
 */
import type { ComponentNode, ComponentStyle, ComponentType } from '@/types/schema'

type StylePartial = Partial<ComponentStyle>

export interface ComponentDefinition {
  /** Display label used in palette & layer panels. */
  label: string
  /** Short description shown as tooltip / palette caption. */
  description: string
  /** Single-character / emoji icon used in the palette tile. */
  icon: string
  /** Default props applied when dropping a fresh instance onto the canvas. */
  defaultProps: Record<string, unknown>
  /** Default style; merged with `{ position: 'absolute', left, top }`. */
  defaultStyle: StylePartial
}

export const componentRegistry: Record<ComponentType, ComponentDefinition> = {
  Text: {
    label: 'Text',
    description: 'Body / paragraph text',
    icon: 'T',
    defaultProps: { content: 'Text' },
    defaultStyle: { width: 200, height: 30, fontSize: 16, color: '#111827' },
  },
  Heading: {
    label: 'Heading',
    description: 'Section heading (H1–H6)',
    icon: 'H',
    defaultProps: { content: 'Heading', level: 2 },
    defaultStyle: {
      width: 360,
      height: 44,
      fontSize: 32,
      fontWeight: 700,
      color: '#111827',
    },
  },
  Image: {
    label: 'Image',
    description: 'Inline image',
    icon: '🖼',
    defaultProps: { src: 'https://placehold.co/300x200', alt: 'Image' },
    defaultStyle: { width: 300, height: 200 },
  },
  Button: {
    label: 'Button',
    description: 'Action / link button',
    icon: 'B',
    defaultProps: { label: 'Button', href: '#', action: 'link' },
    defaultStyle: {
      width: 120,
      height: 40,
      backgroundColor: '#2b579a',
      color: '#ffffff',
      borderRadius: 6,
      fontWeight: 500,
    },
  },
  Container: {
    label: 'Container',
    description: 'Group / section box',
    icon: '▢',
    defaultProps: {},
    defaultStyle: {
      width: 320,
      height: 200,
      backgroundColor: '#f3f4f6',
      borderRadius: 8,
    },
  },
  Divider: {
    label: 'Divider',
    description: 'Horizontal rule',
    icon: '—',
    defaultProps: {},
    defaultStyle: {
      width: 320,
      height: 1,
      backgroundColor: '#e5e7eb',
    },
  },
  Input: {
    label: 'Input',
    description: 'Form input field',
    icon: 'I',
    defaultProps: {
      label: 'Email',
      placeholder: 'you@example.com',
      type: 'text',
    },
    defaultStyle: {
      width: 280,
      height: 64,
      fontSize: 14,
      color: '#111827',
    },
  },
  Map: {
    label: 'Map',
    description: 'Embedded Google Map',
    icon: '📍',
    defaultProps: { address: '1600 Amphitheatre Parkway, Mountain View, CA' },
    defaultStyle: { width: 480, height: 280, borderRadius: 8 },
  },
}

export function getDefaultProps(type: ComponentType): Record<string, unknown> {
  return { ...componentRegistry[type].defaultProps }
}

export function getDefaultStyle(type: ComponentType): StylePartial {
  return { ...componentRegistry[type].defaultStyle }
}

/** Build a fresh node instance ready to drop on the canvas. */
export function createNode(
  type: ComponentType,
  position: { left: number; top: number },
  idSuffix: string | number = Date.now(),
): ComponentNode {
  return {
    id: `node-${idSuffix}`,
    type,
    props: getDefaultProps(type),
    style: {
      position: 'absolute',
      left: position.left,
      top: position.top,
      ...getDefaultStyle(type),
    },
  }
}

/** Order shown in the left palette. */
export const PALETTE_ORDER: ComponentType[] = [
  'Heading',
  'Text',
  'Image',
  'Button',
  'Input',
  'Divider',
  'Container',
  'Map',
]

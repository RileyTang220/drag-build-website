// Runtime renderer - safely renders published pages
'use client'

import React from 'react'
import { COMPONENT_TYPES, PageSchema, ComponentNode, ComponentStyle } from '@/types/schema'
import { TextComponent } from '../components/TextComponent'
import { HeadingComponent } from '../components/HeadingComponent'
import { ImageComponent } from '../components/ImageComponent'
import { ButtonComponent } from '../components/ButtonComponent'
import { DividerComponent } from '../components/DividerComponent'
import { InputComponent } from '../components/InputComponent'
import { MapComponent } from '../components/MapComponent'

interface RuntimeRendererProps {
  schema: PageSchema
}

// Whitelist of allowed component types — driven from the registry source of truth.
const ALLOWED_TYPES: ReadonlySet<string> = new Set(COMPONENT_TYPES)

// Whitelist of allowed style properties
const ALLOWED_STYLE_PROPS = [
  'position',
  'left',
  'top',
  'width',
  'height',
  'zIndex',
  'fontSize',
  'color',
  'backgroundColor',
  'borderColor',
  'borderStyle',
  'borderWidth',
  'borderRadius',
  'padding',
  'margin',
  'textAlign',
  'fontWeight',
]

const PX_PROPS = new Set([
  'left',
  'top',
  'width',
  'height',
  'fontSize',
  'borderRadius',
  'borderWidth',
  'padding',
  'margin',
])

// Sanitize style object to only include whitelisted properties
function sanitizeStyle(style: ComponentStyle | Record<string, unknown>): React.CSSProperties {
  const sanitized: React.CSSProperties = {}
  const styleObj = style as Record<string, unknown>

  for (const key of ALLOWED_STYLE_PROPS) {
    if (styleObj[key] !== undefined) {
      const value = styleObj[key]
      if (PX_PROPS.has(key) && typeof value === 'number') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sanitized[key as keyof React.CSSProperties] = `${value}px` as any
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sanitized[key as keyof React.CSSProperties] = value as any
      }
    }
  }

  return sanitized
}

// Sanitize URL to prevent XSS. Accepts unknown so callers can pass values
// pulled out of an untyped props bag without an extra cast.
function sanitizeUrl(url: unknown): string {
  if (typeof url !== 'string' || !url) return '#'
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:')) {
    return url
  }
  return '#'
}

// Components that paint their own background / border. The wrapper must
// NOT also set them or the same value gets rendered twice and color changes
// look "stuck" on the older layer (matches editor ComponentRenderer).
const SELF_PAINTING_TYPES = new Set(['Container', 'Input', 'Map', 'Divider'])

function renderNode(node: ComponentNode, isNested: boolean = false): React.ReactNode {
  // Only render whitelisted component types
  if (!ALLOWED_TYPES.has(node.type)) {
    return null
  }

  const style = sanitizeStyle(node.style)
  if (SELF_PAINTING_TYPES.has(node.type)) {
    delete (style as Record<string, unknown>).backgroundColor
    delete (style as Record<string, unknown>).borderColor
    delete (style as Record<string, unknown>).borderWidth
    delete (style as Record<string, unknown>).borderStyle
    delete (style as Record<string, unknown>).borderRadius
  }

  // For nested components (inside containers), don't wrap in another div
  const Wrapper = isNested ? React.Fragment : 'div'
  const wrapperProps = isNested ? {} : { style }

  switch (node.type) {
    case 'Text':
      return (
        <Wrapper key={node.id} {...wrapperProps}>
          <TextComponent
            {...node.props}
            color={node.style.color}
            fontSize={node.style.fontSize}
            fontWeight={node.style.fontWeight}
            textAlign={node.style.textAlign}
          />
        </Wrapper>
      )
    case 'Heading':
      return (
        <Wrapper key={node.id} {...wrapperProps}>
          <HeadingComponent
            {...node.props}
            color={node.style.color}
            fontSize={node.style.fontSize}
            fontWeight={node.style.fontWeight}
            textAlign={node.style.textAlign}
          />
        </Wrapper>
      )
    case 'Image':
      return (
        <Wrapper key={node.id} {...wrapperProps}>
          <ImageComponent {...node.props} />
        </Wrapper>
      )
    case 'Button': {
      // Sanitize button href; pass visual styles through from style.
      const buttonProps = {
        ...node.props,
        href: sanitizeUrl(node.props.href),
      }
      return (
        <Wrapper key={node.id} {...wrapperProps}>
          <ButtonComponent
            {...buttonProps}
            backgroundColor={node.style.backgroundColor}
            color={node.style.color}
            borderRadius={node.style.borderRadius}
          />
        </Wrapper>
      )
    }
    case 'Container':
      return (
        <Wrapper key={node.id} {...wrapperProps}>
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
            {node.children?.map((child: ComponentNode) => renderNode(child, true))}
          </div>
        </Wrapper>
      )
    case 'Divider':
      return (
        <Wrapper key={node.id} {...wrapperProps}>
          <DividerComponent
            backgroundColor={node.style.backgroundColor}
            borderStyle={node.style.borderStyle}
            borderColor={node.style.borderColor}
            borderWidth={node.style.borderWidth}
          />
        </Wrapper>
      )
    case 'Input':
      return (
        <Wrapper key={node.id} {...wrapperProps}>
          <InputComponent
            {...node.props}
            color={node.style.color}
            fontSize={node.style.fontSize}
            backgroundColor={node.style.backgroundColor}
            borderColor={node.style.borderColor}
            borderRadius={node.style.borderRadius}
          />
        </Wrapper>
      )
    case 'Map':
      return (
        <Wrapper key={node.id} {...wrapperProps}>
          <MapComponent
            {...node.props}
            borderRadius={node.style.borderRadius}
          />
        </Wrapper>
      )
    default:
      return null
  }
}

export function RuntimeRenderer({ schema }: RuntimeRendererProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      <div
        className="bg-white shadow-lg relative"
        style={{
          width: schema.canvas.width,
          height: schema.canvas.height,
          backgroundColor: schema.canvas.background || '#ffffff',
        }}
      >
        {schema.nodes.map((node) => renderNode(node, false))}
      </div>
    </div>
  )
}

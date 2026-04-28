// Runtime renderer - safely renders published pages
'use client'

import React from 'react'
import { PageSchema, ComponentNode, ComponentStyle } from '@/types/schema'
import { TextComponent } from '../components/TextComponent'
import { ImageComponent } from '../components/ImageComponent'
import { ButtonComponent } from '../components/ButtonComponent'

interface RuntimeRendererProps {
  schema: PageSchema
}

// Whitelist of allowed component types
const ALLOWED_TYPES = ['Text', 'Image', 'Button', 'Container']

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
  'borderWidth',
  'borderRadius',
  'padding',
  'margin',
  'textAlign',
  'fontWeight',
]

// Sanitize style object to only include whitelisted properties
function sanitizeStyle(style: ComponentStyle | Record<string, unknown>): React.CSSProperties {
  const sanitized: React.CSSProperties = {}
  const styleObj = style as Record<string, unknown>
  
  for (const key of ALLOWED_STYLE_PROPS) {
    if (styleObj[key] !== undefined) {
      const value = styleObj[key]
      if (key === 'left' || key === 'top' || key === 'width' || key === 'height') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sanitized[key as keyof React.CSSProperties] = `${value}px` as any
      } else if (key === 'fontSize') {
        sanitized.fontSize = `${value}px`
      } else if (key === 'borderRadius') {
        sanitized.borderRadius = `${value}px`
      } else if (key === 'borderWidth') {
        sanitized.borderWidth = `${value}px`
      } else if (key === 'padding' || key === 'margin') {
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

function renderNode(node: ComponentNode, isNested: boolean = false): React.ReactNode {
  // Only render whitelisted component types
  if (!ALLOWED_TYPES.includes(node.type)) {
    return null
  }

  const style = sanitizeStyle(node.style)

  // For nested components (inside containers), don't wrap in another div
  const Wrapper = isNested ? React.Fragment : 'div'
  const wrapperProps = isNested ? {} : { style }

  switch (node.type) {
    case 'Text':
      return (
        <Wrapper key={node.id} {...wrapperProps}>
          <TextComponent {...node.props} />
        </Wrapper>
      )
    case 'Image':
      return (
        <Wrapper key={node.id} {...wrapperProps}>
          <ImageComponent {...node.props} />
        </Wrapper>
      )
    case 'Button':
      // Sanitize button href
      const buttonProps = {
        ...node.props,
        href: sanitizeUrl(node.props.href),
      }
      return (
        <Wrapper key={node.id} {...wrapperProps}>
          <ButtonComponent {...buttonProps} />
        </Wrapper>
      )
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

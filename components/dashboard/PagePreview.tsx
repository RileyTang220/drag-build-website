// Dashboard thumbnail — renders a real (CSS-scaled) preview of a page
// schema instead of a placeholder icon.
//
// Why a separate renderer instead of reusing RuntimeRenderer:
//   - No <form>/onSubmit (wrong context for thumbnails).
//   - Strips heavy interactive bits: Map iframes, Input controls,
//     Button click handlers — those'd murder dashboard scroll perf with
//     ten cards on screen.
//   - Render is a flat dump of styled <div>s, no hover/focus state.
//
// Scale strategy: ResizeObserver reads the container's actual rendered
// width, then `transform: scale(width / canvas.width)` shrinks the
// natural canvas into the card's 4:3 frame. `transform-origin: top left`
// + `overflow: hidden` clips off the bottom of taller pages so the user
// always sees the *top* of their site (where the hero / brand is).
'use client'

import { useEffect, useRef, useState } from 'react'
import type { ComponentNode, PageSchema } from '@/types/schema'

interface PagePreviewProps {
  schema: PageSchema | null
  className?: string
}

export function PagePreview({ schema, className = '' }: PagePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (typeof w === 'number') setContainerWidth(w)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // Empty / new pages: friendlier than a blank white box.
  if (!schema || !schema.canvas || schema.nodes.length === 0) {
    return (
      <div
        ref={containerRef}
        className={`bg-gray-100 flex items-center justify-center text-3xl text-gray-300 ${className}`}
      >
        📄
      </div>
    )
  }

  const scale =
    containerWidth > 0 && schema.canvas.width > 0
      ? containerWidth / schema.canvas.width
      : 0

  return (
    <div
      ref={containerRef}
      className={`bg-white overflow-hidden relative ${className}`}
      style={{ backgroundColor: schema.canvas.background || '#ffffff' }}
    >
      {/* Hide raw natural-size content until the first ResizeObserver tick
          so we never render a 1200px-wide canvas overflowing a 320px card
          for a flash of unstyled content. */}
      {scale > 0 && (
        <div
          style={{
            width: schema.canvas.width,
            height: schema.canvas.height,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            position: 'absolute',
            top: 0,
            left: 0,
            backgroundColor: schema.canvas.background || '#ffffff',
          }}
        >
          {schema.nodes.map((node) => (
            <PreviewNode key={node.id} node={node} />
          ))}
        </div>
      )}
    </div>
  )
}

function PreviewNode({ node }: { node: ComponentNode }) {
  const s = node.style

  // Visuals shared by every node type.
  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: s.left,
    top: s.top,
    width: s.width,
    height: s.height,
    color: s.color,
    fontSize: s.fontSize,
    fontWeight: s.fontWeight,
    textAlign: s.textAlign,
    borderRadius: s.borderRadius,
    overflow: 'hidden',
    pointerEvents: 'none',
  }

  switch (node.type) {
    case 'Text':
      return (
        <div style={{ ...baseStyle, lineHeight: 1.3, whiteSpace: 'pre-wrap' }}>
          {String(node.props.content ?? '')}
        </div>
      )
    case 'Heading':
      return (
        <div style={{ ...baseStyle, lineHeight: 1.15, fontWeight: s.fontWeight ?? 700 }}>
          {String(node.props.content ?? '')}
        </div>
      )
    case 'Image': {
      const src = typeof node.props.src === 'string' ? node.props.src : ''
      if (!src) {
        return <div style={{ ...baseStyle, backgroundColor: '#e5e7eb' }} />
      }
      // Plain <img> is fine here: thumbnails decode/lazy-load and don't
      // benefit from next/image's optimization pipeline (the image is
      // already shrunk by the surrounding scale() transform).
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          decoding="async"
          loading="lazy"
          style={{ ...baseStyle, objectFit: 'cover' }}
        />
      )
    }
    case 'Button':
      return (
        <div
          style={{
            ...baseStyle,
            backgroundColor: s.backgroundColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: s.fontWeight ?? 500,
          }}
        >
          {String(node.props.label ?? '')}
        </div>
      )
    case 'Container':
      return (
        <div
          style={{
            ...baseStyle,
            backgroundColor: s.backgroundColor,
            border: s.borderWidth
              ? `${s.borderWidth}px solid ${s.borderColor || '#d1d5db'}`
              : undefined,
          }}
        />
      )
    case 'Divider':
      return (
        <div
          style={{
            ...baseStyle,
            backgroundColor: s.backgroundColor || '#e5e7eb',
          }}
        />
      )
    case 'Input':
      // Render as a static field — the actual <input> would steal focus
      // and gobble click events on a thumbnail.
      return (
        <div
          style={{
            ...baseStyle,
            backgroundColor: '#ffffff',
            border: '1px solid #d1d5db',
            borderRadius: s.borderRadius ?? 6,
            padding: 8,
            fontSize: 13,
            color: '#9ca3af',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {String(node.props.label ?? node.props.placeholder ?? 'Input')}
        </div>
      )
    case 'Map':
      // Iframes are heavy; substitute a flat placeholder for thumbnails.
      return (
        <div
          style={{
            ...baseStyle,
            backgroundColor: '#e5e7eb',
            color: '#6b7280',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span>📍 Map</span>
        </div>
      )
    default:
      return null
  }
}

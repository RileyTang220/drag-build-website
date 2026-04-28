// Runtime renderer - safely renders published pages.
//
// The whole page is wrapped in a single <form>: any submit-mode Button
// triggers a POST to /api/forms/[pageId] with every Input's value collected
// via FormData. This is intentionally simple — one logical form per page —
// because the editor doesn't (yet) have a "Form group" container concept.
'use client'

import React, { useState } from 'react'
import {
  COMPONENT_TYPES,
  PageSchema,
  ComponentNode,
  ComponentStyle,
} from '@/types/schema'
import { TextComponent } from '../components/TextComponent'
import { HeadingComponent } from '../components/HeadingComponent'
import { ImageComponent } from '../components/ImageComponent'
import { ButtonComponent } from '../components/ButtonComponent'
import { DividerComponent } from '../components/DividerComponent'
import { InputComponent } from '../components/InputComponent'
import { MapComponent } from '../components/MapComponent'

interface RuntimeRendererProps {
  schema: PageSchema
  /**
   * Page id required to POST form submissions. When omitted, submit
   * buttons render but do nothing — useful for previewing schemas
   * without a backing page row.
   */
  pageId?: string
}

const ALLOWED_TYPES: ReadonlySet<string> = new Set(COMPONENT_TYPES)

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

const SELF_PAINTING_TYPES = new Set(['Container', 'Input', 'Map', 'Divider'])

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

function sanitizeUrl(url: unknown): string {
  if (typeof url !== 'string' || !url) return '#'
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:')) {
    return url
  }
  return '#'
}

/**
 * Convert an Input's label into a key that satisfies the formSubmission
 * Zod regex (`^[a-zA-Z0-9 ._-]+$`). Replace illegal runs with `_` and
 * cap at 64 chars. We sanitize on the client AND the server validates,
 * so weird characters never reach the database.
 */
function sanitizeFieldName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9 ._-]+/g, '_').trim().slice(0, 64)
  return cleaned || 'field'
}

function renderNode(node: ComponentNode, isNested: boolean = false): React.ReactNode {
  if (!ALLOWED_TYPES.has(node.type)) return null

  const style = sanitizeStyle(node.style)
  if (SELF_PAINTING_TYPES.has(node.type)) {
    delete (style as Record<string, unknown>).backgroundColor
    delete (style as Record<string, unknown>).borderColor
    delete (style as Record<string, unknown>).borderWidth
    delete (style as Record<string, unknown>).borderStyle
    delete (style as Record<string, unknown>).borderRadius
  }

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
    case 'Input': {
      // Use the user-set label as the form field name so submissions are
      // self-describing. The server applies the same regex so anything the
      // client lets through is safe to store.
      const label = (node.props.label as string) || ''
      const explicitName = (node.props.name as string) || ''
      const fieldName = sanitizeFieldName(explicitName || label || 'field')
      return (
        <Wrapper key={node.id} {...wrapperProps}>
          <InputComponent
            {...node.props}
            name={fieldName}
            color={node.style.color}
            fontSize={node.style.fontSize}
            backgroundColor={node.style.backgroundColor}
            borderColor={node.style.borderColor}
            borderRadius={node.style.borderRadius}
          />
        </Wrapper>
      )
    }
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

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error'

export function RuntimeRenderer({ schema, pageId }: RuntimeRendererProps) {
  const [status, setStatus] = useState<SubmitStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!pageId) {
      setStatus('error')
      setError('Form submission is only available on the published page.')
      return
    }
    const form = e.currentTarget
    const formData = new FormData(form)
    const fields: Record<string, string> = {}
    for (const [key, value] of formData.entries()) {
      if (typeof value !== 'string') continue
      const safeKey = sanitizeFieldName(key)
      // Skip empty fields so we don't submit a junk record on a button
      // click without any actual input.
      const trimmed = value.trim()
      if (!trimmed) continue
      fields[safeKey] = trimmed.slice(0, 5000)
    }

    if (Object.keys(fields).length === 0) {
      setStatus('error')
      setError('Please fill in at least one field before submitting.')
      return
    }

    setStatus('submitting')
    setError(null)
    try {
      const res = await fetch(`/api/forms/${pageId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error?.message || `HTTP ${res.status}`)
      }
      setStatus('success')
      form.reset()
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Submission failed')
    }
  }

  const banner = (() => {
    if (status === 'submitting') return null
    if (status === 'success') {
      return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2 rounded shadow text-sm">
          Thanks! Your submission was received.
        </div>
      )
    }
    if (status === 'error' && error) {
      return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded shadow text-sm">
          {error}
        </div>
      )
    }
    return null
  })()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      {banner}
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-lg relative"
        style={{
          width: schema.canvas.width,
          height: schema.canvas.height,
          backgroundColor: schema.canvas.background || '#ffffff',
          opacity: status === 'submitting' ? 0.7 : 1,
          pointerEvents: status === 'submitting' ? 'none' : 'auto',
        }}
      >
        {schema.nodes.map((node) => renderNode(node, false))}
      </form>
    </div>
  )
}
